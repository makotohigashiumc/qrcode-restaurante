"""
email_service.py — RF02 + RF05
Cole em: backend/services/email_service.py

Variáveis necessárias no .env:
  MAIL_SERVER, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD
  MAIL_DEFAULT_SENDER, FRONTEND_URL
"""
from flask_mail import Mail, Message
from flask import current_app

mail = Mail()  # Inicializar no app.py com: mail.init_app(app)


def enviar_verificacao(destinatario: str, nome: str, token: str):
    url = current_app.config.get("FRONTEND_URL", "http://localhost:5173")
    link = f"{url}/verificar-email/{token}"
    msg = Message(subject="Confirme seu e-mail", recipients=[destinatario])
    msg.html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <div style="background:#1C1410;padding:20px 24px;border-radius:10px 10px 0 0">
        <p style="color:#C8855A;font-size:18px;margin:0;font-weight:600">qrcoderestaurante</p>
      </div>
      <div style="background:#fff;border:1px solid #E0D5C8;padding:28px 24px;border-radius:0 0 10px 10px">
        <h2 style="color:#1C1410;font-size:20px;margin:0 0 12px">Confirme seu e-mail</h2>
        <p style="color:#5A4535;font-size:14px;line-height:1.6;margin:0 0 24px">
          Olá, <strong>{nome}</strong>! Clique no botão para confirmar seu e-mail.
        </p>
        <a href="{link}" style="display:inline-block;background:#C8855A;color:#fff;
           text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:500">
          Confirmar e-mail
        </a>
        <p style="color:#A89880;font-size:12px;margin:24px 0 0">
          Link expira em <strong>24 horas</strong>. Se não criou esta conta, ignore este e-mail.
        </p>
      </div>
    </div>"""
    mail.send(msg)


def enviar_recuperacao(destinatario: str, nome: str, token: str):
    url = current_app.config.get("FRONTEND_URL", "http://localhost:5173")
    link = f"{url}/admin/nova-senha/{token}"
    msg = Message(subject="Redefinição de senha", recipients=[destinatario])
    msg.html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <div style="background:#1C1410;padding:20px 24px;border-radius:10px 10px 0 0">
        <p style="color:#C8855A;font-size:18px;margin:0;font-weight:600">qrcoderestaurante</p>
      </div>
      <div style="background:#fff;border:1px solid #E0D5C8;padding:28px 24px;border-radius:0 0 10px 10px">
        <h2 style="color:#1C1410;font-size:20px;margin:0 0 12px">Redefinir senha</h2>
        <p style="color:#5A4535;font-size:14px;line-height:1.6;margin:0 0 24px">
          Olá, <strong>{nome}</strong>! Clique para redefinir sua senha.
        </p>
        <a href="{link}" style="display:inline-block;background:#C8855A;color:#fff;
           text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:500">
          Redefinir senha
        </a>
        <p style="color:#A89880;font-size:12px;margin:24px 0 0">
          Link expira em <strong>1 hora</strong>. Se não solicitou, ignore este e-mail.
        </p>
      </div>
    </div>"""
    mail.send(msg)
