"""
AI总结服务
"""
import os
import aiohttp
from typing import Dict, List, Any
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class AISummarizer:
    """AI总结生成器类"""
    
    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        self.base_url = os.getenv("DEEPSEEK_API_URL")
    
    async def generate_summaries(self, analysis_data: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        为每个团队成员生成工作总结
        """
        summaries = []
        raw_data = analysis_data.get("rawData", [])
        
        # 按成员分组
        member_data = {}
        for record in raw_data:
            member = record["member"]
            if member not in member_data:
                member_data[member] = []
            member_data[member].append(record)
        
        # 为每个成员生成总结
        for member, records in member_data.items():
            # 计算统计数据
            total_tasks = len(records)
            completed_tasks = len([r for r in records if r.get("status") == "已完成"])
            total_hours = sum(float(r.get("actualHours", 0)) for r in records)
            avg_saturation = (total_hours / (len(set(r.get("date") for r in records)) * 8)) * 100
            
            # 生成提示文本
            prompt = self._generate_prompt(
                member=member,
                total_tasks=total_tasks,
                completed_tasks=completed_tasks,
                avg_saturation=avg_saturation,
                records=records
            )
            
            # 调用AI接口生成总结
            summary = await self._call_ai_api(prompt)
            
            summaries.append({
                "name": member,
                "content": summary
            })
        
        return summaries
    
    def _generate_prompt(self, member: str, total_tasks: int, 
                        completed_tasks: int, avg_saturation: float,
                        records: List[Dict]) -> str:
        """
        生成AI提示文本
        """
        # 统计任务类型分布
        task_types = {}
        for record in records:
            task_type = record.get("taskType", "未分类")
            task_types[task_type] = task_types.get(task_type, 0) + 1
        
        # 构建提示文本
        prompt = f"""
请对团队成员{member}的工作情况进行分析和总结，以下是相关数据：

1. 工作量概况：
- 总任务数：{total_tasks}个
- 已完成任务：{completed_tasks}个
- 平均工作饱和度：{avg_saturation:.1f}%

2. 任务类型分布：
{chr(10).join(f'- {t}: {c}个任务' for t, c in task_types.items())}

请从以下几个方面进行分析：
1. 工作量和效率评估
2. 任务分布和专注度
3. 工作饱和度分析
4. 改进建议

请用简洁专业的语言，生成300字左右的总结。
"""
        return prompt
    
    async def _call_ai_api(self, prompt: str) -> str:
        """
        调用AI接口生成总结文本
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.base_url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "messages": [
                            {"role": "user", "content": prompt}
                        ],
                        "model": "deepseek-chat",
                        "temperature": 0.7,
                        "max_tokens": 800
                    }
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data["choices"][0]["message"]["content"]
                    else:
                        error_data = await response.text()
                        raise Exception(f"AI API调用失败: {error_data}")
        except Exception as e:
            print(f"生成总结时发生错误: {str(e)}")
            return "无法生成总结，请稍后重试。" 