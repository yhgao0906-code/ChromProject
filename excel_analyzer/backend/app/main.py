"""
Excel工作量分析后端服务
"""
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from app.services.excel_service import ExcelAnalyzer
from app.services.ai_service import AISummarizer
from app.models.response_models import AnalysisResponse

app = FastAPI(
    title="Excel工作量分析服务",
    description="分析Excel中的工作量数据，生成可视化报告",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该设置具体的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/excel/analyze", response_model=AnalysisResponse)
async def analyze_excel(file: UploadFile = File(...)):
    """
    分析上传的Excel文件
    """
    try:
        # 创建Excel分析器实例
        analyzer = ExcelAnalyzer(file)
        # 分析数据
        analysis_result = await analyzer.analyze()
        
        # 使用AI生成个人总结
        ai_summarizer = AISummarizer()
        summaries = await ai_summarizer.generate_summaries(analysis_result)
        
        # 合并结果
        analysis_result.update({
            "personalSummaries": summaries
        })
        
        return AnalysisResponse(
            status="success",
            data=analysis_result,
            message="分析完成"
        )
    except Exception as e:
        return AnalysisResponse(
            status="error",
            data=None,
            message=str(e)
        )

@app.get("/api/excel/report")
async def generate_report():
    """
    生成Excel分析报告
    """
    try:
        analyzer = ExcelAnalyzer()
        report_data = await analyzer.generate_report()
        return report_data
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        } 