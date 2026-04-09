import sqlite3, json

db = sqlite3.connect('omnysys.db')
row = db.execute('SELECT payload_json FROM compiler_metrics_snapshots WHERE snapshot_kind="folderization" ORDER BY LENGTH(payload_json) DESC LIMIT 1').fetchone()
data = json.loads(row[0])

db_health = data.get('snapshot', {}).get('databaseHealth', {})
metrics = db_health.get('metrics', {})

print(f"databaseHealth keys: {list(db_health.keys())}")
print(f"metrics type: {type(metrics)}")

if isinstance(metrics, list):
    print(f"metrics count: {len(metrics)}")
    if len(metrics) > 0:
        print(f"First metric keys: {list(metrics[0].keys()) if isinstance(metrics[0], dict) else metrics[0]}")
        # Show a few samples
        for i, m in enumerate(metrics[:3]):
            print(f"  [{i}] {json.dumps(m, indent=2)[:200]}...")
elif isinstance(metrics, dict):
    print(f"metrics keys: {list(metrics.keys())[:20]}")
    for k, v in list(metrics.items())[:5]:
        if isinstance(v, (list, dict)):
            print(f"  {k}: {len(v)} items")
        else:
            print(f"  {k}: {v}")
