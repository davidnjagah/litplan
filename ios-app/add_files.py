#!/usr/bin/env python3
import os
import uuid

# Read the project.pbxproj file
pbxproj_path = "Litplan.xcodeproj/project.pbxproj"
with open(pbxproj_path, 'r') as f:
    content = f.read()

# Generate UUIDs for the new files
async_image_uuid = str(uuid.uuid4()).replace('-', '')[:24].upper()
async_image_build_uuid = str(uuid.uuid4()).replace('-', '')[:24].upper()
haptic_manager_uuid = str(uuid.uuid4()).replace('-', '')[:24].upper()
haptic_manager_build_uuid = str(uuid.uuid4()).replace('-', '')[:24].upper()

# Find the Components group
components_group_start = content.find('/* Components */')
if components_group_start == -1:
    print("Components group not found")
    exit(1)

# Find line with Components group
group_line_start = content.rfind('\n', 0, components_group_start)
group_line = content[group_line_start:components_group_start + 20]

# Extract group ID
components_group_id = group_line.split()[0].strip()

# Find the Utilities group
utilities_group_start = content.find('/* Utilities */')
if utilities_group_start == -1:
    print("Utilities group not found")
    exit(1)

# Find line with Utilities group
util_line_start = content.rfind('\n', 0, utilities_group_start)
util_line = content[util_line_start:utilities_group_start + 20]

# Extract group ID
utilities_group_id = util_line.split()[0].strip()

print(f"Components Group ID: {components_group_id}")
print(f"Utilities Group ID: {utilities_group_id}")
print(f"AsyncImageView UUID: {async_image_uuid}")
print(f"HapticManager UUID: {haptic_manager_uuid}")

# Add file references
file_ref_section_start = content.find('/* Begin PBXFileReference section */')
file_ref_section_end = content.find('/* End PBXFileReference section */')

new_file_refs = f"""\t\t{async_image_uuid} /* AsyncImageView.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = AsyncImageView.swift; sourceTree = "<group>"; }};
\t\t{haptic_manager_uuid} /* HapticManager.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = HapticManager.swift; sourceTree = "<group>"; }};
"""

content = content[:file_ref_section_end] + new_file_refs + content[file_ref_section_end:]

# Add to groups
# Find Components group children
components_children_start = content.find(f'{components_group_id} /* Components */ = {{')
components_children_end = content.find('};', components_children_start)
components_section = content[components_children_start:components_children_end]

# Find children array in Components
children_start = components_section.find('children = (')
if children_start != -1:
    insert_pos = content.find('children = (', components_children_start) + len('children = (') + 1
    new_component_entry = f"\t\t\t\t{async_image_uuid} /* AsyncImageView.swift */,\n"
    content = content[:insert_pos] + new_component_entry + content[insert_pos:]

# Find Utilities group children
utilities_children_start = content.find(f'{utilities_group_id} /* Utilities */ = {{')
utilities_children_end = content.find('};', utilities_children_start)
utilities_section = content[utilities_children_start:utilities_children_end]

# Find children array in Utilities
children_start = utilities_section.find('children = (')
if children_start != -1:
    insert_pos = content.find('children = (', utilities_children_start) + len('children = (') + 1
    new_util_entry = f"\t\t\t\t{haptic_manager_uuid} /* HapticManager.swift */,\n"
    content = content[:insert_pos] + new_util_entry + content[insert_pos:]

# Add to build phases (PBXSourcesBuildPhase)
sources_build_start = content.find('/* Begin PBXSourcesBuildPhase section */')
sources_build_section_start = content.find('files = (', sources_build_start)
insert_pos = sources_build_section_start + len('files = (') + 1

new_build_entries = f"""\t\t\t\t{async_image_build_uuid} /* AsyncImageView.swift in Sources */,
\t\t\t\t{haptic_manager_build_uuid} /* HapticManager.swift in Sources */,
"""

content = content[:insert_pos] + new_build_entries + content[insert_pos:]

# Add PBXBuildFile entries
build_file_start = content.find('/* Begin PBXBuildFile section */')
build_file_end = content.find('/* End PBXBuildFile section */')

new_build_files = f"""\t\t{async_image_build_uuid} /* AsyncImageView.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {async_image_uuid} /* AsyncImageView.swift */; }};
\t\t{haptic_manager_build_uuid} /* HapticManager.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {haptic_manager_uuid} /* HapticManager.swift */; }};
"""

content = content[:build_file_end] + new_build_files + content[build_file_end:]

# Write back
with open(pbxproj_path, 'w') as f:
    f.write(content)

print("Files added successfully!")
