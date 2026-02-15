"""
Excel分析服务
"""
import pandas as pd
import numpy as np
from fastapi import UploadFile
from typing import Dict, List, Any
from datetime import datetime

class ExcelAnalyzer:
    """Excel分析器类"""
    
    def __init__(self, file: UploadFile = None):
        self.file = file
        self.df = None
    
    async def analyze(self) -> Dict[str, Any]:
        """
        分析Excel文件内容
        """
        # 读取Excel文件
        content = await self.file.read()
        self.df = pd.read_excel(content)
        
        # 数据预处理
        self._preprocess_data()
        
        # 执行分析
        return {
            "workload": self._analyze_workload(),
            "timeVariance": self._analyze_time_variance(),
            "taskTypes": self._analyze_task_types(),
            "rawData": self.df.to_dict('records')
        }
    
    def _preprocess_data(self):
        """
        数据预处理
        """
        # 确保日期列为datetime类型
        self.df['date'] = pd.to_datetime(self.df['date'])
        
        # 确保工时列为数值类型
        self.df['estimatedHours'] = pd.to_numeric(self.df['estimatedHours'], errors='coerce')
        self.df['actualHours'] = pd.to_numeric(self.df['actualHours'], errors='coerce')
        
        # 填充空值
        self.df['taskType'] = self.df['taskType'].fillna('未分类')
        self.df['estimatedHours'] = self.df['estimatedHours'].fillna(0)
        self.df['actualHours'] = self.df['actualHours'].fillna(0)
    
    def _analyze_workload(self) -> Dict[str, Any]:
        """
        分析工作量数据
        """
        # 按日期和成员分组计算工作饱和度
        daily_workload = self.df.groupby(['date', 'member'])['actualHours'].sum().reset_index()
        daily_workload['saturation'] = (daily_workload['actualHours'] / 8) * 100
        
        # 获取所有唯一日期和成员
        dates = sorted(daily_workload['date'].unique())
        members = sorted(daily_workload['member'].unique())
        
        # 构建每个成员的饱和度数据
        member_data = []
        for member in members:
            member_workload = daily_workload[daily_workload['member'] == member]
            saturation_data = []
            
            for date in dates:
                day_data = member_workload[member_workload['date'] == date]
                saturation = float(day_data['saturation'].iloc[0]) if not day_data.empty else 0
                saturation_data.append(saturation)
            
            member_data.append({
                "name": member,
                "saturation": saturation_data
            })
        
        return {
            "dates": [d.strftime('%Y-%m-%d') for d in dates],
            "members": member_data
        }
    
    def _analyze_time_variance(self) -> Dict[str, Any]:
        """
        分析工时差异
        """
        # 计算每个任务的预估工时和实际工时
        task_times = self.df.groupby('taskName').agg({
            'estimatedHours': 'sum',
            'actualHours': 'sum'
        }).reset_index()
        
        return {
            "tasks": task_times['taskName'].tolist(),
            "estimated": task_times['estimatedHours'].tolist(),
            "actual": task_times['actualHours'].tolist()
        }
    
    def _analyze_task_types(self) -> Dict[str, int]:
        """
        分析任务类型分布
        """
        return self.df['taskType'].value_counts().to_dict()
    
    async def generate_report(self) -> bytes:
        """
        生成Excel分析报告
        """
        if self.df is None:
            raise ValueError("没有可用的分析数据")
        
        # 创建一个新的Excel writer
        writer = pd.ExcelWriter('report.xlsx', engine='openpyxl')
        
        # 1. 工作量统计表
        workload_stats = self.df.groupby('member').agg({
            'taskName': 'count',
            'actualHours': 'sum'
        }).reset_index()
        workload_stats.columns = ['成员', '任务数量', '总工时']
        workload_stats['平均日工时'] = workload_stats['总工时'] / len(self.df['date'].unique())
        workload_stats.to_excel(writer, sheet_name='工作量统计', index=False)
        
        # 2. 任务完成情况
        task_completion = self.df.groupby(['member', 'taskType']).agg({
            'taskName': 'count',
            'estimatedHours': 'sum',
            'actualHours': 'sum'
        }).reset_index()
        task_completion.columns = ['成员', '任务类型', '任务数量', '预估工时', '实际工时']
        task_completion['工时差异'] = task_completion['实际工时'] - task_completion['预估工时']
        task_completion.to_excel(writer, sheet_name='任务完成情况', index=False)
        
        # 3. 每日工作详情
        daily_details = self.df.copy()
        daily_details['date'] = daily_details['date'].dt.strftime('%Y-%m-%d')
        daily_details.columns = ['日期', '成员', '任务名称', '任务类型', '预估工时', '实际工时']
        daily_details.to_excel(writer, sheet_name='每日工作详情', index=False)
        
        # 保存并返回文件内容
        writer.save()
        with open('report.xlsx', 'rb') as f:
            return f.read() 