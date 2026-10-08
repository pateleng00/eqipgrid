import re

with open('equipgrid-website/src/services/api.ts', 'r') as f:
    content = f.read()

# Replace FALLBACK_HUBS array contents with empty array
content = re.sub(r'export const FALLBACK_HUBS: HubInfo\[\] = \[.*?\];', 'export const FALLBACK_HUBS: HubInfo[] = [];', content, flags=re.DOTALL)

# Replace FALLBACK_EQUIPMENT array contents with empty array
content = re.sub(r'export const FALLBACK_EQUIPMENT: Equipment\[\] = \[.*?\];', 'export const FALLBACK_EQUIPMENT: Equipment[] = [];', content, flags=re.DOTALL)

# Remove the fallback returns from fetchEquipmentList
content = re.sub(r'// Fallback to local inventory.*?\n\s*return FALLBACK_EQUIPMENT\.filter\(.*?\);', 'return [];', content, flags=re.DOTALL)

# Remove fallback from fetchEquipmentById
content = re.sub(r'return FALLBACK_EQUIPMENT\.find\(.*?\) \|\| null;', 'return null;', content, flags=re.DOTALL)

# Remove fallback from fetchHubs
content = re.sub(r'return FALLBACK_HUBS;', 'return [];', content, flags=re.DOTALL)

with open('equipgrid-website/src/services/api.ts', 'w') as f:
    f.write(content)

