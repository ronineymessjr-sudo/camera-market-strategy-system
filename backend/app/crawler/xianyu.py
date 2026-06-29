from .generic import crawl_generic_page

async def crawl(url: str, screenshot_name: str = "xianyu.png"):
    return await crawl_generic_page(url, screenshot_name)
