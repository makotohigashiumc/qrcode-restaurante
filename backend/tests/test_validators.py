"""
Testes unitários — Módulo: validators.py
Cobre a validação de senha e de e-mail.
Não depende de banco de dados nem de requisições HTTP.
"""
import pytest
from app.services.validators import validar_senha, validar_email


# ─── validar_senha ────────────────────────────────────────────────────────────

class TestValidarSenha:

    def test_senha_valida(self):
        """Senha que atende todos os critérios deve retornar True e lista vazia."""
        ok, erros = validar_senha("Senha@123")
        assert ok is True
        assert erros == []

    def test_senha_curta(self):
        """Senha com menos de 8 caracteres deve ser rejeitada."""
        ok, erros = validar_senha("Ab@1")
        assert ok is False
        assert any("caracteres" in e for e in erros)

    def test_sem_maiuscula(self):
        """Senha sem letra maiúscula deve ser rejeitada."""
        ok, erros = validar_senha("senha@123")
        assert ok is False
        assert any("maiúscula" in e for e in erros)

    def test_sem_minuscula(self):
        """Senha sem letra minúscula deve ser rejeitada."""
        ok, erros = validar_senha("SENHA@123")
        assert ok is False
        assert any("minúscula" in e for e in erros)

    def test_sem_numero(self):
        """Senha sem número deve ser rejeitada."""
        ok, erros = validar_senha("Senha@abc")
        assert ok is False
        assert any("número" in e for e in erros)

    def test_sem_caractere_especial(self):
        """Senha sem caractere especial deve ser rejeitada."""
        ok, erros = validar_senha("Senha1234")
        assert ok is False
        assert any("especial" in e for e in erros)

    def test_senha_vazia(self):
        """Senha vazia deve acumular múltiplos erros."""
        ok, erros = validar_senha("")
        assert ok is False
        assert len(erros) > 1

    def test_multiplos_erros(self):
        """Senha fraca deve retornar todos os erros de uma vez."""
        ok, erros = validar_senha("abc")
        assert ok is False
        assert len(erros) >= 3


# ─── validar_email ────────────────────────────────────────────────────────────

class TestValidarEmail:

    def test_email_valido(self):
        assert validar_email("usuario@email.com") is True

    def test_email_valido_subdominio(self):
        assert validar_email("usuario@mail.empresa.com.br") is True

    def test_email_sem_arroba(self):
        assert validar_email("usuarioemail.com") is False

    def test_email_sem_dominio(self):
        assert validar_email("usuario@") is False

    def test_email_sem_ponto(self):
        assert validar_email("usuario@emailcom") is False

    def test_email_vazio(self):
        assert validar_email("") is False

    def test_email_com_espacos(self):
        assert validar_email("  usuario@email.com  ") is True  # strip interno
