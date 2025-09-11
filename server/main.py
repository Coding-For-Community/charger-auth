import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "config.asgi:application",
        host="127.0.0.1",
        port=8001,
        reload=True,
    )