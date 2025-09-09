import ninja

class ScannerAppLoginSchema(ninja.Schema):
    password: str
    verify: bool
