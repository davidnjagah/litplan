#!/usr/bin/env python3
import os
import uuid

# Read the project.pbxproj file
pbxproj_path = "Litplan.xcodeproj/project.pbxproj"
with open(pbxproj_path, 'r') as f:
    content = f.read()

# Generate UUIDs for the new files
splash_view_uuid = str(uuid.uuid4()).replace('-', '')[:24].upper()
splash_view_build_uuid = str(uuid.uuid4()).replace('-', '')[:24].upper()
assets_uuid = str(uuid.uuid4()).replace('-', '')[:24].upper()
assets_build_uuid = str(uuid.uuid4()).replace('-', '')[:24].upper()

# Find the Views group
views_group_start = content.find('/* Views */')
if views_group_start == -1:
    print("Views group not found")
    exit(1)

# Find line with Views group
group_line_start = content.rfind('\n', 0, views_group_start)
group_line = content[group_line_start:views_group_start + 15]

# Extract group ID
views_group_id = group_line.split()[0].strip()

# Find the Litplan group (root) for Assets
litplan_group_start = content.find('/* Litplan */ = {')
litplan_group_id = None
if litplan_group_start != -1:
    # Find the line
    line_start = content.rfind('\n', 0, litplan_group_start)
    line = content[line_start:litplan_group_start + 20]
    litplan_group_id = line.split()[0].strip()

print(f"Views Group ID: {views_group_id}")
print(f"Litplan Group ID: {litplan_group_id}")
print(f"SplashScreenView UUID: {splash_view_uuid}")
print(f"Assets UUID: {assets_uuid}")

# Add file references
file_ref_section_end = content.find('/* End PBXFileReference section */')

new_file_refs = f"""\t\t{splash_view_uuid} /* SplashScreenView.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = SplashScreenView.swift; sourceTree = "<group>"; }};
\t\t{assets_uuid} /* Assets.xcassets */ = {{isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = Assets.xcassets; sourceTree = "<group>"; }};
"""

content = content[:file_ref_section_end] + new_file_refs + content[file_ref_section_end:]

# Add SplashScreenView to Views group children
views_children_start = content.find(f'{views_group_id} /* Views */ = {{')
if views_children_start != -1:
    insert_pos = content.find('children = (', views_children_start) + len('children = (') + 1
    new_view_entry = f"\t\t\t\t{splash_view_uuid} /* SplashScreenView.swift */,\n"
    content = content[:insert_pos] + new_view_entry + content[insert_pos:]

# Add Assets.xcassets to Litplan group children (after Resources or any existing child)
if litplan_group_id:
    litplan_children_start = content.find(f'{litplan_group_id} /* Litplan */ = {{')
    if litplan_children_start != -1:
        insert_pos = content.find('children = (', litplan_children_start) + len('children = (') + 1
        new_asset_entry = f"\t\t\t\t{assets_uuid} /* Assets.xcassets */,\n"
        content = content[:insert_pos] + new_asset_entry + content[insert_pos:]

# Add to build phases (PBXSourcesBuildPhase) - for Swift file
sources_build_start = content.find('/* Begin PBXSourcesBuildPhase section */')
sources_build_section_start = content.find('files = (', sources_build_start)
insert_pos = sources_build_section_start + len('files = (') + 1

new_build_entry = f"""\t\t\t\t{splash_view_build_uuid} /* SplashScreenView.swift in Sources */,
"""

content = content[:insert_pos] + new_build_entry + content[insert_pos:]

# Add to PBXResourcesBuildPhase - for Assets
resources_build_start = content.find('/* Begin PBXResourcesBuildPhase section */')
if resources_build_start != -1:
    resources_files_start = content.find('files = (', resources_build_start)
    insert_pos = resources_files_start + len('files = (') + 1
    new_resource_entry = f"""\t\t\t\t{assets_build_uuid} /* Assets.xcassets in Resources */,
"""
    content = content[:insert_pos] + new_resource_entry + content[insert_pos:]

# Add PBXBuildFile entries
build_file_end = content.find('/* End PBXBuildFile section */')

new_build_files = f"""\t\t{splash_view_build_uuid} /* SplashScreenView.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {splash_view_uuid} /* SplashScreenView.swift */; }};
\t\t{assets_build_uuid} /* Assets.xcassets in Resources */ = {{isa = PBXBuildFile; fileRef = {assets_uuid} /* Assets.xcassets */; }};
"""

content = content[:build_file_end] + new_build_files + content[build_file_end:]

# Write back
with open(pbxproj_path, 'w') as f:
    f.write(content)

print("Files added successfully!")
