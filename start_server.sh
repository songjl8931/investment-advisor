#!/bin/bash
# 腾讯云服务器启动脚本

echo "=== 启动投资顾问系统 ==="

# 进入项目目录
cd /var/www/investment-advisor

# 激活Python虚拟环境
source venv/bin/activate

# 启动FastAPI服务
python server.py