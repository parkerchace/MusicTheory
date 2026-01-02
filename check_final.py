import json

with open('scale_validation_results_final.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print('Final Summary:')
print(f'  Total scales: {data["summary"]["total"]}')
print(f'  ✅ Verified (KEEP): {data["summary"]["keep"]}')
print(f'  ⚠️  Under review: {data["summary"]["review"]}')
print(f'  ❌ To remove: {data["summary"]["remove"]}')

print('\nScales still marked for removal:')
for scale in data['results']:
    if scale['recommendation'] == 'REMOVE':
        print(f'  - {scale["display_name"]} ({scale["scale_name"]})')

print('\nTotal cleanup summary:')
print('  Started with: 146 scales')
print('  Removed music genres/dances: 27')
print('  Removed vague cultural scales: 32')
print('  Promoted legitimate scales: 17')
print(f'  Final verified scales: {data["summary"]["keep"]}')
print('  Scales removed from database: 59')