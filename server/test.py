import asyncio
import time
import uuid

import aiohttp


async def dummy_req(s: aiohttp.ClientSession, kiosk_token: str, i: int):
    print(uuid.uuid4().hex)
    async with s.get(
        f"https://crack-monkfish-monthly.ngrok-free.app/checkin/userToken/?kiosk_token={kiosk_token}"
    ) as resp:
        token = (await resp.json())["token"]
    async with s.post(
        "https://crack-monkfish-monthly.ngrok-free.app/checkin/run/",
        json={
            "email": f"student_{i}@caryacademy.org",
            "device_id": uuid.uuid4().hex,
            "user_token": token,
        },
    ) as resp:
        await resp.json()


async def main():
    async with aiohttp.ClientSession(headers={"ngrok-skip-browser-warning": "1"}) as s:
        start = time.time()
        async with s.get(
            "https://crack-monkfish-monthly.ngrok-free.app/checkin/kioskToken/"
        ) as resp:
            kiosk_token = (await resp.json())["token"]
        await asyncio.gather(*[dummy_req(s, kiosk_token, i) for i in range(15)])
        print(f"Elapsed: {time.time() - start}")


if __name__ == "__main__":
    asyncio.run(main())
