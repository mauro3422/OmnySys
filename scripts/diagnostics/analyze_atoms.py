import sqlite3, json

db = sqlite3.connect('omnysys.db')
row = db.execute('SELECT payload_json FROM compiler_metrics_snapshots WHERE snapshot_kind="folderization" ORDER BY LENGTH(payload_json) DESC LIMIT 1').fetchone()
data = json.loads(row[0])

atoms = data.get('snapshot', {}).get('databaseHealth', {}).get('metrics', {}).get('activeAtoms', {})

print(f"activeAtoms type: {type(atoms)}")
if isinstance(atoms, dict):
    print(f"activeAtoms keys: {list(atoms.keys())[:20]}")
    
    # Check if it has a list of all atoms
    for key in atoms.keys():
        val = atoms[key]
        if isinstance(val, list):
            print(f"  {key}: {len(val)} items")
            if len(val) > 0:
                print(f"    Sample: {json.dumps(val[0])[:200]}")
        elif isinstance(val, dict):
            print(f"  {key}: dict with {len(val)} keys")
        else:
            print(f"  {key}: {val}")
