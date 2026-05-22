import requests


def buscar_cep(cep: str) -> dict | None:
    """Consulta a API pública ViaCEP e retorna os dados do endereço."""
    cep_limpo = "".join(filter(str.isdigit, cep))
    if len(cep_limpo) != 8:
        return None
    try:
        resp = requests.get(
            f"https://viacep.com.br/ws/{cep_limpo}/json/",
            timeout=5
        )
        if resp.status_code == 200:
            data = resp.json()
            if "erro" in data:
                return None
            return data
    except requests.RequestException:
        pass
    return None
