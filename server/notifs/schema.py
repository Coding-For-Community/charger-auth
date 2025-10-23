from ninja import Schema


class UnregisterSchema(Schema):
    email: str


class RegisterSchema(Schema):
    email: str
    subscription: dict
    device_id: str
