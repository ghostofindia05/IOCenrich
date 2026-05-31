import logging
import re

class SensitiveDataFilter(logging.Filter):
    """
    Redacts sensitive data from logs, such as JWT tokens, API keys, and Authorization headers.
    """
    # Regex patterns for finding potential secrets
    # Matches Bearer tokens/JWTs
    BEARER_REGEX = re.compile(r"(Bearer\s+)[A-Za-z0-9\-\._~\+\/]+=*")
    # Matches common API key patterns (e.g. 32-64 char hex/alphanumeric)
    API_KEY_REGEX = re.compile(r"(api_key|apikey|key)[\"\'\s:=]+([A-Za-z0-9\-\_]{20,})", re.IGNORECASE)

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            # Redact Authorization Bearer Tokens
            record.msg = self.BEARER_REGEX.sub(r"\1[REDACTED_JWT]", record.msg)
            # Redact API Keys
            record.msg = self.API_KEY_REGEX.sub(r"\1 [REDACTED_KEY]", record.msg)
            
        return True

def setup_secure_logging():
    logging.basicConfig(level=logging.INFO)
    # Apply filter to the root logger
    for handler in logging.root.handlers:
        handler.addFilter(SensitiveDataFilter())
