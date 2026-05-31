import re
import ipaddress
import tldextract
from typing import List, Dict, Any

# Robust Regexes adhering to the research phase specifications
REGEX_IPV4 = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')
REGEX_DOMAIN = re.compile(r'\b[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b')
REGEX_URL = re.compile(r'\b(?:https?|ftp|fxp):\/\/(?:[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|\d{1,3}(?:\.\d{1,3}){3})(?::\d{1,5})?(?:\/[^\s\"<>]*)?\b')
REGEX_HASH = re.compile(r'\b[a-fA-F0-9]{32,64}\b')

def _is_private_ip(ip_str: str) -> bool:
    """Uses Python's built-in ipaddress module to detect RFC 1918 ranges"""
    try:
        ip = ipaddress.ip_address(ip_str)
        return ip.is_private
    except ValueError:
        return False

def extract_indicators(raw_text: str) -> List[Dict[str, Any]]:
    """
    Parses raw text and extracts precise IOCs, tagging private IPs to pivot 
    to local EDR tools rather than exposing them externally (CWE-200).
    """
    found_indicators = []
    seen_values = set()
    
    # 1. URLs
    urls = REGEX_URL.findall(raw_text)
    for url in urls:
        if url not in seen_values:
            seen_values.add(url)
            found_indicators.append({
                "value": url,
                "type": "url",
                "is_internal": False # URLs usually require deeper parsing for internality, defaulted False
            })
        
    # 2. IPv4
    ips = REGEX_IPV4.findall(raw_text)
    for ip in ips:
        if ip not in seen_values:
            seen_values.add(ip)
            is_internal = _is_private_ip(ip)
            found_indicators.append({
                "value": ip,
                "type": "ipv4",
                "is_internal": is_internal
            })
        
    # 3. Domains (Using tldextract for precision)
    domains = REGEX_DOMAIN.findall(raw_text)
    for dom in domains:
        # Prevent picking up IPs matched by domain regex mistakenly
        if _is_private_ip(dom) or REGEX_IPV4.match(dom):
            continue
            
        ext = tldextract.extract(dom)
        # Reconstruct the precise registered domain (e.g. example.co.uk instead of co.uk)
        if ext.domain and ext.suffix:
            precise_domain = f"{ext.domain}.{ext.suffix}"
            if precise_domain not in seen_values:
                seen_values.add(precise_domain)
                found_indicators.append({
                    "value": precise_domain,
                    "type": "domain",
                    "is_internal": False
                })
            
    # 4. Hashes (MD5, SHA1, SHA256)
    hashes = REGEX_HASH.findall(raw_text)
    for h in hashes:
        if h not in seen_values:
            seen_values.add(h)
            found_indicators.append({
                "value": h,
                "type": "hash",
                "is_internal": False
            })
        
    return found_indicators
