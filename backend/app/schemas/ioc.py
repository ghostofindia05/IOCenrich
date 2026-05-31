from pydantic import BaseModel, Field, constr
from typing import List, Optional

class IOCSubmission(BaseModel):
    # Strictly limit raw text to prevent memory exhaustion / massive regex processing
    raw_text: str = Field(..., max_length=100_000, description="Raw text containing indicators to extract")
    defang: bool = Field(default=True, description="Whether to defang the indicators")

class IndicatorResult(BaseModel):
    value: str = Field(..., max_length=1000)
    type: str = Field(..., pattern="^(ipv4|domain|url|hash)$")
    is_internal: bool = Field(default=False)

class IOCResponse(BaseModel):
    task_id: str
    message: str
    extracted_count: int
    submission_id: str

class ExtractResponse(BaseModel):
    indicators: List[IndicatorResult]

class AnalyzeRequest(BaseModel):
    raw_text: str = Field(default="", max_length=100_000)
    indicators: List[IndicatorResult]
    defang: bool = Field(default=True)
