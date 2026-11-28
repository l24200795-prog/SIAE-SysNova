
import os

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template
from supabase import Client, create_client

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Verificar configuración
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "Faltan SUPABASE_URL o SUPABASE_KEY en el archivo .env"
    )

# Conexión con Supabase
supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)


@app.route("/")
def inicio():
    return render_template("index.html")


@app.route("/api/actividades", methods=["GET"])
def obtener_actividades():
    try:
        respuesta = supabase.rpc(
            "obtener_catalogo_actividades"
        ).execute()

        return jsonify({
            "success": True,
            "data": respuesta.data
        })

    except Exception as error:
        app.logger.exception("Error al consultar actividades")

        return jsonify({
            "success": False,
            "message": "No fue posible cargar el catálogo."
        }), 500


if __name__ == "__main__":
    app.run(debug=True)

