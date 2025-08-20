# METADATA
# scope: package
# title: Empty String check not complete
# description: All microflows must follow the mendix recomended naming convintion
# authors:
# - Xiwen Cheng <x@cinaq.com>
# custom:
#  category: Error
#  rulename: MicroflowNamingCheck
#  severity: MEDIUM
#  rulenumber: 005_0003
#  remediation: Always check a string for empty based on != empty and != "". The first one equals database NULL value, the latter one indicates a truncated string.
#  input: "**/*$Microflow.yaml"

package app.mendix.microflows.naming_check
import rego.v1
annotation := rego.metadata.chain()[1].annotations


default allow := false
allow if count(errors) == 0

errors contains error if {
    name = input.Name

    not regex.match(`^ACT_[A-Z0-9_]+$`, name)
    
    error := sprintf("Microflow name is not following the naming convintion",
        [
            annotation.custom.severity,
            annotation.custom.category,
            annotation.custom.rulenumber,
            name,
        ]
    )
}
