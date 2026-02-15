"""
API响应模型定义
"""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

class WorkloadData(BaseModel):
    """工作量数据模型"""
    dates: List[str]
    members: List[Dict[str, Any]]

class TimeVarianceData(BaseModel):
    """工时差异数据模型"""
    tasks: List[str]
    estimated: List[float]
    actual: List[float]

class PersonalSummary(BaseModel):
    """个人总结数据模型"""
    name: str
    content: str

class AnalysisData(BaseModel):
    """分析结果数据模型"""
    workload: WorkloadData
    timeVariance: TimeVarianceData
    taskTypes: Dict[str, int]
    personalSummaries: List[PersonalSummary]

class AnalysisResponse(BaseModel):
    """API响应模型"""
    status: str
    data: Optional[AnalysisData]
    message: str 