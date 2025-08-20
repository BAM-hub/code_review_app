# METADATA
# scope: package
# title: Entities must have at least one access rule
# description: Every entity should define at least one access rule for security.
# authors:
# - Your Name <you@example.com>
# custom:
#  category: DomainModel
#  rulename: EntityAccessRequired
#  severity: HIGH
#  rulenumber: 002_0008
#  remediation: Add at least one access rule for each entity.
#  input: "*/DomainModels$DomainModel.yaml"


package app.mendix.domain.entity_access_required
import rego.v1

annotation := rego.metadata.chain()[1].annotations


default allow := false

allow if count(errors) == 0

errors contains error if {
    entity := input.Entities[_]
    access_rules := entity.AccessRules
    access_rules_count := count([access_rules[_]])
    access_rules_count > 0
    
    error := sprintf("[%v, %v, %v] Entity %q has no access rules",
        [
            annotation.custom.severity,
            annotation.custom.category,
            annotation.custom.rulenumber,
            access_rules_count,
        ]
    )
}
