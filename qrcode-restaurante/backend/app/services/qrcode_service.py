import qrcode
import io
import base64
from qrcode.image.svg import SvgImage


def gerar_qrcode_base64(url: str) -> str:
    """Gera um QR Code SVG em base64 para a URL informada."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(image_factory=SvgImage)
    buffer = io.BytesIO()
    img.save(buffer)
    buffer.seek(0)
    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/svg+xml;base64,{b64}"
