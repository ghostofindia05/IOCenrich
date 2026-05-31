import re

# Comprehensive defanging patterns established in the research/specification phase
DEFANG_RULES = [
    (r"http://", "hxxp://"),
    (r"https://", "hxxps://"),
    (r"ftp://", "fxp://"),
    (r"\.", "[.]"),
    (r"@", "[@]")
]

def defang_indicator(indicator: str) -> str:
    """
    Safely defangs an indicator (IP, Domain, URL, Email) by replacing 
    executable URI schemes and top-level domain separators with bracketed equivalents.
    (e.g., http://malicious.com --> hxxp://malicious[.]com)
    """
    defanged = indicator
    for pattern, replacement in DEFANG_RULES:
        # We use standard string replace for exact protocol matches to avoid regex overhead,
        # but regex is safer for global punctuation replacements like . and @
        if pattern.startswith(r"\.") or pattern.startswith(r"@"):
            defanged = re.sub(pattern, replacement, defanged)
        else:
            # Drop the regex formatting if just doing standard string manipulation for protocols
            clean_pattern = pattern.replace("\\", "")
            defanged = defanged.replace(clean_pattern, replacement)
            
    return defanged

# Utility for refanging (though reports generally only need defanging)
def refang_indicator(defanged_str: str) -> str:
    """Reverses the defanging process for internal engine processing."""
    refanged = defanged_str
    
    # Reverse the rules
    REVERSE_RULES = [
        ("hxxps://", "https://"),
        ("hxxp://", "http://"),
        ("fxp://", "ftp://"),
        ("[.]", "."),
        ("[@]", "@")
    ]
    
    for old, new in REVERSE_RULES:
        refanged = refanged.replace(old, new)
        
    return refanged
