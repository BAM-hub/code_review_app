# METADATA
# scope: package
# title: No more that 1 activeity in a microflow
# description: azzeh asked for it.
# authors:
# - Bashar Amin <bamin@avertra.com>
# custom:
#  category: Maintainability
#  rulename: NumberOfACtivities
#  severity: MEDIUM
#  rulenumber: 006_0005
#  remediation: better split your microflows.
#  input: .*\$Microflow\.yaml

package app.mendix.domain_model.number_of_activities
import rego.v1
annotation := rego.metadata.chain()[1].annotations

default allow := false
allow if count(errors) == 0

max_attributes := 1
#  you should count the objects with actions only
# convert this to js to handle cases
errors contains error if {
    name := input.Name
    object := input.ObjectCollection[_]
    not object.Objects == null
    count_attributes := count(object.Objects)
    count_attributes > max_attributes
    error := sprintf("",
        [
            annotation.custom.severity,
            annotation.custom.category,
            annotation.custom.rulenumber,
            name,
            count_attributes,
            max_attributes
        ]
    )
}