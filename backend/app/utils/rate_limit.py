from slowapi import Limiter
from slowapi.util import get_remote_address

# 全局限流器：default_limits 仅对显式使用 @limiter.limit 装饰的路由生效
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])
