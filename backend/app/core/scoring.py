from typing import Dict, Any

def aggregate_threat_score(results: Dict[str, Any], is_internal: bool = False) -> int:
    """
    Normalizes and weighs risk scores from various external Threat Intel feeds
    into a single 0-100 confidence score representing maliciousness.
    """
    if is_internal:
        return 0
        
    total_score = 0
    weights = {
        'vt': 0.4,
        'urlscan': 0.2,
        'abuseipdb': 0.3,
        'greynoise': 0.1
    }
    
    # 1. VirusTotal
    vt_res = results.get("vt", {})
    vt_attrs = vt_res.get("data", {}).get("attributes", {})
    if "last_analysis_stats" in vt_attrs:
        stats = vt_attrs["last_analysis_stats"]
        malicious = stats.get("malicious", 0)
        total = sum(stats.values())
        if total > 0:
            total_score += (malicious / total) * 100 * weights['vt']
            
    # 2. URLScan
    us_res = results.get("urlscan", {})
    if us_res and "verdicts" in us_res:
        verdicts = us_res["verdicts"]
        if verdicts.get("overall", {}).get("malicious", False):
            total_score += 100 * weights['urlscan']
            
    # 3. AbuseIPDB
    ab_res = results.get("abuseipdb", {})
    ab_data = ab_res.get("data", {})
    if "abuseConfidenceScore" in ab_data:
        total_score += ab_data["abuseConfidenceScore"] * weights['abuseipdb']
        
    # 4. GreyNoise
    gn_res = results.get("greynoise", {})
    if gn_res and (gn_res.get("classification") == "malicious" or gn_res.get("noise") == True):
        # GN only tells if it's noise or malicious
        score = 100 if gn_res.get("classification") == "malicious" else 50
        total_score += score * weights['greynoise']
            
    return min(int(total_score), 100)

def extract_intel_context(results: Dict[str, Any]) -> Dict[str, Any]:
    context = {"asn": None, "geoip": None, "campaign": None, "mapped_ttp": None}
    
    # Extract from VirusTotal
    vt_res = results.get("vt", {})
    vt_attrs = vt_res.get("data", {}).get("attributes", {})
    if vt_attrs:
        if "asn" in vt_attrs:
            context["asn"] = f"AS{vt_attrs['asn']} {vt_attrs.get('as_owner', '')}".strip()
        if "country" in vt_attrs:
            context["geoip"] = vt_attrs["country"]
        if "popular_threat_classification" in vt_attrs:
            ptc = vt_attrs["popular_threat_classification"]
            if "popular_threat_category" in ptc and ptc["popular_threat_category"]:
                context["mapped_ttp"] = ptc["popular_threat_category"][0].get("value")
            if "popular_threat_name" in ptc and ptc["popular_threat_name"]:
                context["campaign"] = ptc["popular_threat_name"][0].get("value")

    # Extract from AbuseIPDB (Overwrites VT if available for IPs)
    ab_res = results.get("abuseipdb", {}).get("data", {})
    if "isp" in ab_res:
        context["asn"] = ab_res["isp"]
    if "countryCode" in ab_res:
        context["geoip"] = ab_res["countryCode"]

    # Extract from GreyNoise
    gn_res = results.get("greynoise", {})
    if "metadata" in gn_res:
        if gn_res["metadata"].get("asn"):
            context["asn"] = gn_res["metadata"]["asn"]
        if gn_res["metadata"].get("country"):
            context["geoip"] = gn_res["metadata"]["country"]
        if gn_res["metadata"].get("organization"):
            context["asn"] = gn_res["metadata"]["organization"]
    if gn_res.get("name") and gn_res.get("name") != "unknown":
        context["campaign"] = gn_res["name"]
        context["mapped_ttp"] = "Scanner / Known Actor"

    # Clean up empty strings
    for k, v in context.items():
        if v == "":
            context[k] = None

    return context
