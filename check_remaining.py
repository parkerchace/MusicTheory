import json

with open('scale_validation_results_cleaned.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print('Remaining scales under review:')
for scale in data['results']:
    if scale['recommendation'] == 'REVIEW':
        print(f'  - {scale["display_name"]} ({scale["scale_name"]})')