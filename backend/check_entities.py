from app import create_app
from models.database import Entity

app = create_app()
with app.app_context():
    entities = Entity.query.filter_by(conversation_id="paste-your-id-here").all()
    for e in entities:
        print(e.name, "-", e.entity_type, "-", e.description)