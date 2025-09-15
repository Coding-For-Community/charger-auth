import asyncio
from io import BytesIO

import torch
import torch.nn.functional as F
import ninja

from PIL import Image
from base64 import b64decode
from datetime import time, datetime
from ninja.errors import HttpError
from ninja.throttling import AnonRateThrottle
from checkin.core.api_methods import get_curr_free_block, is_resetting, free_blocks_today, daily_reset, \
    fetch_student_img
from checkin.core.checkin_token import prev_token, curr_token, update_checkin_token
from checkin.core.types import ALL_FREE_BLOCKS, FreeBlock
from checkin.models import Student
from checkin.schema import CheckInSchema, FaceVerifySchema
from config import settings
from facenet_pytorch import MTCNN, InceptionResnetV1
from oauth.api import oauth_client

SIZE = (256, 256)
mtcnn = MTCNN(image_size=SIZE[0], margin=1)
resnet = InceptionResnetV1(pretrained='vggface2').eval()
router = ninja.Router()

def get_student(email_b64: str):
    return Student.objects.filter(email=b64decode(email_b64).decode('utf-8')).afirst()

def img_tensor(data: bytes) -> torch.Tensor | None:
    img = Image.open(BytesIO(data))
    return mtcnn(img.convert("RGB").resize(SIZE))

@router.get("/token/")
async def checkin_token(request):
    delta_secs = (datetime.now() - curr_token().timestamp).total_seconds()
    if delta_secs < 0 or delta_secs > 5:
        update_checkin_token()
        return {
            "id": str(curr_token().uuid),
            "time_until_refresh": 5,
        }
    return {
        "id": str(curr_token().uuid),
        "time_until_refresh": 5 - delta_secs,
    }

@router.get("/notCheckedInStudents/{free_block}/")
async def not_checked_in_students(request, free_block: FreeBlock):
    if free_block not in ALL_FREE_BLOCKS:
        raise HttpError(400, "Invalid free block: " + free_block)
    students = Student.objects.all()
    output = []
    async for student in students:
        if free_block in student.free_blocks and free_block not in student.checked_in_blocks:
            output.append({
                "id": student.id,
                "name": student.name,
            })
    return { "students": output }

@router.get("/checkedInStudents/{free_block}/")
async def checked_in_students(request, free_block: FreeBlock):
    if free_block not in ALL_FREE_BLOCKS:
        raise HttpError(400, "Invalid free block: " + free_block)
    students = Student.objects.all()
    output = []
    async for student in students:
        if free_block in student.checked_in_blocks:
            output.append({
                "id": student.id,
                "name": student.name,
            })
    return { "students": output }

# noinspection PyTypeChecker
@router.get("/freeBlockNow/{email_b64}/")
async def free_block_now(request, email_b64: str):
    student = await get_student(email_b64)
    curr_free_block = get_curr_free_block()
    if not student or not curr_free_block:
        return { "has_free_block": False }
    return {
        "curr_free_block": curr_free_block,
        "has_free_block": curr_free_block in student.free_blocks
    }

@router.get("/studentExists/{email_b64}")
async def student_exists(request, email_b64: str):
    student = await get_student(email_b64)
    return { "exists": student is not None }

@router.get("/userFreeBlocks/{email_b64}/")
async def all_user_free_blocks(request, email_b64: str):
    student = await get_student(email_b64)
    if not student:
        raise HttpError(400, "Invalid email")
    result = []
    for free_block, start_time in free_blocks_today():
        if free_block in student.free_blocks:
            result.append({
                "name": free_block,
                "seconds_from_12_AM": (start_time - time(0, 0)).total_seconds()
            })
    return { "free_blocks": result }

@router.get("/forceReset/", throttle=AnonRateThrottle('3/d'))
async def force_reset(request):
    if not is_resetting():
        await daily_reset(False)
    return { "success": True }

@router.post("/run/")
async def check_in_user(request, data: CheckInSchema):
    while is_resetting():
        await asyncio.sleep(0.5)
    if data.checkin_token != str(curr_token().uuid) and data.checkin_token != str(prev_token().uuid):
        raise HttpError(403, "Invalid checkin token.")
    free_block = get_curr_free_block()
    if not free_block:
        raise HttpError(405, "No free block is available - you're probably past the 10 min margin")
    student = await get_student(data.email_b64)
    if not student:
        raise HttpError(400, "Invalid Student")
    student.checked_in_blocks += free_block
    await student.asave()
    return { "success": True }

@router.post("/verifyFace/")
async def verify_face(request, data: FaceVerifySchema):
    with torch.no_grad():
        email = b64decode(data.email_b64).decode('utf-8')
        comparator_task = asyncio.create_task(fetch_student_img(email))
        posted_img = img_tensor(b64decode(data.face_image_b64))
        true_img_url = await comparator_task
        if true_img_url is None or posted_img is None:
            return { "similarity": -1 }
        client = await oauth_client()
        true_img = img_tensor((await client.get(true_img_url)).read())
        if not true_img:
            return { "similarity": -1 }
        embeddings = torch.cat((posted_img.unsqueeze(0), true_img.unsqueeze(0)))
        embeddings = resnet(embeddings)
        return {
            "similarity": F.cosine_similarity(embeddings[0], embeddings[1]).item(),
        }

if settings.DEBUG:
    @router.delete("/clear/")
    async def reset_data_debug(request):
        await Student.objects.all().adelete()

    @router.get("/testGetImg/{email}")
    async def test_get_img(request, email: str):
        img_url = await fetch_student_img(email)
        return {"img_url": img_url}
