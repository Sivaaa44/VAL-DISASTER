import spacy
from flask import Flask, request, jsonify

app = Flask(__name__)
nlp = spacy.load("en_core_web_sm")

ACCEPTED_NEEDS = ['food', 'medicine', 'supplies']

def extract_location(doc):
    location_entities = []
    for ent in doc.ents:
        if ent.label_ in ['GPE', 'LOC', 'FAC']:
            location_entities.append(ent.text)
    
    # Join all location entities
    location = ', '.join(location_entities)
    
    # If no entities were found, try to extract based on common location words
    if not location:
        location_words = ['nagar', 'street', 'road', 'avenue', 'district', 'area', 'paathai','salai', 'theru']
        tokens = [token.text for token in doc if token.text.lower() in location_words or token.text.lower() == 'chennai']
        if tokens:
            start_index = doc.text.lower().index(tokens[0].lower())
            end_index = doc.text.lower().index(tokens[-1].lower()) + len(tokens[-1])
            location = doc.text[start_index:end_index]
    
    return location

@app.route('/process', methods=['POST'])
def process_text():
    text = request.json['text']
    doc = nlp(text)
    
    address = extract_location(doc)
    
    needs = [token.text.lower() for token in doc if token.text.lower() in ACCEPTED_NEEDS]
    
    numbers = [token.text for token in doc if token.like_num]
    
    return jsonify({
        'address': address,
        'numbers': numbers,
        'needs': needs,
        'full_text': text
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)