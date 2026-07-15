import json
from collections import Counter

d = json.load(open('docs/swagger.json', encoding='utf-8'))

tag_counts = Counter()
for path, methods in d['paths'].items():
    for method, detail in methods.items():
        for tag in detail.get('tags', ['Untagged']):
            tag_counts[tag] += 1

print("=== Endpoints by module ===")
for tag, count in sorted(tag_counts.items(), key=lambda x: -x[1]):
    print(f"  {tag:25s} {count}")

total = sum(len(methods) for methods in d['paths'].values())
print(f"\nPaths: {len(d['paths'])}, Endpoints: {total}, Schemas: {len(d['components']['schemas'])}")
