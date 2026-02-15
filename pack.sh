#!/bin/bash

# 宇航工具箱插件打包脚本

# 获取版本号
VERSION=$(grep '"version"' manifest.json | cut -d '"' -f 4)
FILENAME="yuhang-toolbox-v${VERSION}.zip"

echo "开始打包宇航工具箱插件 v${VERSION}..."

# 创建打包文件列表
FILES=(
  "manifest.json"
  "background.js"
  "content.js"
  "api-service.js"
  "sidepanel.html"
  "sidepanel.js"
  "styles.css"
  "images/*"
)

# 创建打包命令
CMD="zip -r ${FILENAME} ${FILES[@]}"

# 执行打包
echo "执行命令: $CMD"
eval $CMD

if [ $? -eq 0 ]; then
  echo "打包成功：${FILENAME}"
  echo "文件大小：$(du -h ${FILENAME} | cut -f1)"
  echo "文件路径：$(pwd)/${FILENAME}"
else
  echo "打包失败"
  exit 1
fi 