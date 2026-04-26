"""
validators.py — RF04
Cole este arquivo em: backend/services/validators.py
"""
import re

SENHA_MIN_LEN = 8

def validar_senha(senha: str):
    erros = []
    if len(senha) < SENHA_MIN_LEN:
        erros.append(f"Mínimo de {SENHA_MIN_LEN} caracteres.")
    if not re.search(r"[a-z]", senha):
        erros.append("Deve conter ao menos uma letra minúscula.")
    if not re.search(r"[A-Z]", senha):
        erros.append("Deve conter ao menos uma letra maiúscula.")
    if not re.search(r"\d", senha):
        erros.append("Deve conter ao menos um número.")
    if not re.search(r"[!@#$%^&*()\-_=+{}\[\]:;<>,.?/\\|`~]", senha):
        erros.append("Deve conter ao menos um caractere especial (!@#$%...).")
    return (len(erros) == 0, erros)

def validar_email(email: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email.strip()))
