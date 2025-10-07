import ffmpeg
import os

from contextlib import contextmanager
from django.core.files.storage import FileSystemStorage
from django.core.files.uploadedfile import UploadedFile

storage = FileSystemStorage()


@contextmanager
def compress_video(video: UploadedFile):
    """
    Compresses a video file using FFmpeg by reducing its resolution and bitrate.
    """
    temp_filename = storage.save(f"temp/{video.name}", video)
    temp_path = os.path.join(storage.location, temp_filename)

    output_filename = f"compressed/{os.path.splitext(video.name)[0]}_compressed.webm"
    output_path = os.path.join(storage.location, output_filename)

    (
        ffmpeg.input(temp_path)
        .output(
            output_path,
            crf=28,  # Constant Rate Factor: 0 (lossless) to 51 (worst quality), 28 is a good balance
            an=None,
            sn=None,
            loglevel="error",
            vf="scale=-2:240",  # Reduce resolution to 240p (maintains aspect ratio)
        )
        .run()
    )

    output_file = open(output_path, "rb")
    django_file_obj = UploadedFile(
        output_file, name=output_filename, content_type="video/webm"
    )

    try:
        yield django_file_obj
    finally:
        output_file.close()
        os.remove(temp_path)
        os.remove(output_path)


if __name__ == "__main__":
    (
        ffmpeg.input(r"C:\Users\Daniel_Chen\Downloads\Daniel C-A.webm")
        .output(
            r"C:\Users\Daniel_Chen\WebProjects\charger-auth\server\media\compressed\test.webm",
            crf=28,  # Constant Rate Factor: 0 (lossless) to 51 (worst quality), 28 is a good balance
            an=None,
            sn=None,
            vf="scale=-2:240",  # Reduce resolution to 240p (maintains aspect ratio)
        )
        .run()
    )
