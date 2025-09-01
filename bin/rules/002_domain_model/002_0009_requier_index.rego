# METADATA
# scope: package
# title: Use Indexes in domain model.
# description: Indexes are essential for data attributes that are used in searching the db.
# authors:
# - Bashar Amin <bamin@avertra.com>
# custom:
#  category: Performance
#  rulename: UseIndexes
#  severity: MEDIUM
#  rulenumber: 002_0009
#  remediation: Add datamodel validation rules.
#  input: ".*/DomainModels$DomainModel.yaml"
package app.mendix.domain_model.require_index

import rego.v1
annotation := rego.metadata.chain()[1].annotations

default allow := false

allow if count(errors) == 0

errors contains error if {
    entity := input.Entities[_]
    entity_name := entity.Name
    indexes_count := count([index | index := entity.Indexes[_]])
    indexes_count == 0
    
    error := sprintf("[%v, %v, %v] indexes %v in entity %v",
        [
            annotation.custom.severity,
            annotation.custom.category,
            annotation.custom.rulenumber,
            indexes_count,
            entity_name
        ]
    )
}
