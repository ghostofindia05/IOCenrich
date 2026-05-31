from app.core.extractor import extract_indicators

raw_text = """
Check this out:
http://malicious.com/test
192.168.1.1 (internal)
8.8.8.8 (public)
abc.def.com
0123456789abcdef0123456789abcdef (md5)
"""

indicators = extract_indicators(raw_text)
print(f"Extracted {len(indicators)} indicators:")
for ind in indicators:
    print(f"- {ind['value']} ({ind['type']}) [Internal: {ind['is_internal']}]")

# Check defanging
from app.reporting.defanger import defang_indicator
print("\nDefanging Test:")
print(f"Original: http://malicious.com --> Defanged: {defang_indicator('http://malicious.com')}")
