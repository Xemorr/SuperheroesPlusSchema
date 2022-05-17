import { IfPath, PropertyTypes, EffectModes, ConditionModes } from "./PreprocessedSchema";
import { MonoTypeObject, objectPropertyMap } from "./utils";

export {
	Schema, 
	Hero, Skill, Trigger, Condition, Effect, 
	Types, IfThenRefrence, 
	Path, Property, PropertyClass, PropertyMap, types, 
	SkillDefinition, TriggerDefinition, ConditionDefinition, EffectDefinition, TypeDefinition
}

class Schema {

	readonly $schema = "http://json-schema.org/schema";
	readonly type = "object"
	readonly additionalProperties = false
	readonly minProperties = 1
	readonly patternProperties = {
		".*": {
			$ref: "#/definitions/hero"
		}
	}
	readonly definitions = {
		hero: new Hero(),
		skill: new Skill(),
		trigger: new Trigger(),
		condition: new Condition(),
		effect: new Effect()
	}
	readonly skills: MonoTypeObject<SkillDefinition> = {}
	readonly triggers: MonoTypeObject<TriggerDefinition> = {}
	readonly conditions: MonoTypeObject<ConditionDefinition> = {}
	readonly effects: MonoTypeObject<EffectDefinition> = {}
	readonly types: MonoTypeObject<TypeDefinition> = {}
}

class Hero {
	readonly description = "Hero name"
	readonly type = "object"
	readonly additionalProperties = false
	readonly properties = {
		colouredName: {
			description: "The coloured name that will appear ingame",
			type: "string"
		},
		description: {
			description: "The description of the hero",
			type: "string"
		},
		skills: {
			description: "The list of skill that the hero has",
			type: "object",
			additionalProperties: false,
			patternProperties: {
				".*": {
					$ref: "#/definitions/skill"
				}
			}
		}
	}
}

type constDescription = {const: string, description: string}

type Types_oneOf = ({ enum: string[], oneOf: constDescription[] }|{})[]

class Types {
	readonly description: string
	readonly type = "string"
	readonly oneOf: Types_oneOf = [{}]

	addType(name: string, description: string): void {
		this.oneOf.push({const: name, description: description})
	}

	constructor(description: string) {
		this.description = description
	}
}

class IfThenRefrence {
	if: {properties: {type: {const: string}} | {skill: {const: string}}}
	then: {$ref: string}

	constructor(type: string, name: string) {
		this.if = {properties: type == "skill"? {skill:{const: name}} : {type: {const: name}}}
		this.then = {$ref: `#/${type}s/${name}`}
	}

}

class Skill {
	readonly description = "A skill"
	readonly type = "object"
	readonly properties = { skill: new Types("The type of the skill") }
	readonly required = ["skill"]
	readonly if = {"properties": {"skill": false}}
	readonly else: {allOf: IfThenRefrence[]} = {allOf: []}

	addSkill(name: string, description: string): void {
		this.properties.skill.addType(name, description)
		this.else.allOf.push(new IfThenRefrence("skill", name))
	}
}

class Trigger {
	readonly description = "The skill trigger"
	readonly type = "object"
	readonly properties = {
		type: new Types("The type of trigger"),
		conditions: {
			description: "The list of conditions",
			type: "object",
			patternProperties: {
			".*": {
					$ref: "#/definitions/condition"
				}
			}
		}
	}
	readonly if = {"properties": {"type": false}}
	readonly else: {allOf: IfThenRefrence[]} = {allOf: []}
	readonly required = ["type"]

	addType(name: string, description: string): void {
		this.properties.type.addType(name, description)
		this.else.allOf.push(new IfThenRefrence("trigger", name))
	}
}

class Condition {
	readonly type = "object"
	readonly properties = {
		type: new Types("The type of the condition"),
		mode: {
			description: "The condition mode",
			type: "string"
		}
	}
	readonly required = ["type", "mode"]
	readonly if = {"properties": {"type": false}}
	readonly else: {allOf: IfThenRefrence[]} = {allOf: []}

	addType(name: string, description: string): void {
		this.properties.type.addType(name, description)
		this.else.allOf.push(new IfThenRefrence("condition", name))
	}
}

class Effect {
	readonly type = "object"
	readonly properties = {
		type: new Types("The type of the effect"),
		mode: {
			description: "The effect mode",
			type: "string"
		}
	}
	readonly required = ["type", "mode"]
	readonly if = {"properties": {"type": false}}
	readonly else: {allOf: IfThenRefrence[]} = {allOf: []}

	addType(name: string, description: string): void {
		this.properties.type.addType(name, description)
		this.else.allOf.push(new IfThenRefrence("effect", name))
	}
}

type types = "array" | "object" | "string" | "number" | "integer" | "boolean"

type PropertyMap = MonoTypeObject<Property>

class Path {

	readonly parts: string[]

	constructor(parts: string)
	constructor(...parts: string[])
	constructor(parts: string[] | string) {
		if (parts instanceof Array) {
			this.parts = parts
			return
		}
		this.parts = parts.split("/")
	}

	asIf(content: IfPath): IfPath {
		var originalPath: IfPath = {}
		var path: IfPath = originalPath
		this.parts.forEach((part: string) => {
			path[part] = {}
			path = path[part]
		})
		return originalPath
	}
	asString(): string {
		return this.parts.join("/")
	}

}

type Property = {
	description?: string
	default?: any
	type?: types | types[]
	minimum?: number
	maximum?: number
	items?: Property
	properties?: PropertyMap
	patternProperties?: PropertyMap
	$ref?: string
	if?: IfPath
	then?: Property
	else?: Property
	required?: string[]
	enum?: any[]
	allOf?: Property[]
	anyOf?: Property[]
}

class PropertyClass implements Property {
	description?: string
	default?: any
	type?: types | types[]
	minimum?: number
	maximum?: number
	items?: Property
	properties?: PropertyMap
	patternProperties?: PropertyMap
	$ref?: string
	if?: IfPath
	then?: Property
	else?: Property
	required?: string[]
	enum?: any[]
	allOf?: Property[]
	anyOf?: Property[]

	name: string
	path: Path
	parent: object

	constructor(parent: object, name: string, path: string)
	constructor(parent: {path: Path}, name: string)
	constructor(parent: {path: Path} | object, name: string, path?: string) {
		this.name = name
		this.parent = parent

		if (path !== undefined) {
			this.path = new Path(path)
			return
		}
		if (!("path" in parent)) {// this if should never happen
			this.path = new Path()
			return
		}
		this.path = new Path(...parent.path.parts, name)
	}

	setDescription(description: string): void {
		this.description = description
	}
	setDefault(defaultVal: any): void {
		this.default = defaultVal
	}
	addType(type: PropertyTypes): void {
		let parsedType = this.parseType(type)
		if (parsedType === undefined) return

		if (this.type === undefined) {
			this.type = parsedType
			return
		}
		if (this.type instanceof Array) {
			this.type.push(parsedType)
			return
		}
		this.type = [this.type, parsedType]
	}
	private static readonly typesArray = ["array", "object", "string", "number", "integer", "boolean"]
	private parseType(type: PropertyTypes): types | undefined {
		if (PropertyClass.typesArray.includes(type)) {
			return type as types
		} else {
			this.addAllOf({$ref: `#/types/${type}`})
		}
	}
	setMin(min: number): void {
		this.minimum = min
	}
	setMax(max: number): void {
		this.maximum = max
	}
	setRange(min: number, max: number): void {
		this.minimum = min
		this.maximum = max
	}
	setItems(items: Property): void {
		this.items = items
	}
	addProperty(name: string, property: Property): void {
		if (this.properties == undefined) this.properties = {}
		this.properties[name] = property
	}
	addPatternProperty(name: string, patternPropety: Property): void {
		if (this.patternProperties == undefined) this.patternProperties = {}
		this.patternProperties[name] = patternPropety
	}
	set$ref($ref: string): void {
		this.$ref = $ref
	}
	setIf(ifVal: IfPath): void {
		this.if = ifVal
	}
	setThen(then: Property): void {
		this.then = then
	}
	setElse(elseVal: Property): void {
		this.else = elseVal
	}
	setIfThenElse(ifVal: IfPath, then: Property, elseVal?: Property): void {
		this.if = ifVal
		this.then = then
		if (elseVal !== undefined) this.else = elseVal
	}
	addRequired(required: string): void {
		if (this.required === undefined) this.required = []
		this.required.push(required)
	}
	setEnum(enumVal: any[]): void {
		this.enum = enumVal
	}
	addAllOf(property: Property): void {
		if (this.allOf === undefined) this.allOf = []
		this.allOf.push(property)
	}

}

abstract class Definition {
	readonly properties: MonoTypeObject<Property | boolean>
	required?: string[]
	readonly additionalProperties = false
	if?: true
	then?: {$ref: string}

	constructor(properties: MonoTypeObject<Property | boolean>) {
		this.properties = properties
	}

	addProperty(name: string, property: Property, required?: true): void {
		this.properties[name] = property
		if (required) {
			if (this.required === undefined) this.required = []
			this.required.push(name)
		}
	}
	protected internalSetExtension(type: string, extension: string) {
		this.if = true
		this.then = {$ref: `#/${type}s/${extension.toUpperCase()}`}
	}

}

class SkillDefinition extends Definition {

	constructor() {
		super({ skill: true });
	}

	setExtension(extension: string) {
		this.internalSetExtension("skill", extension)
	}

}

class TriggerDefinition extends Definition {

	constructor() {
		super({ type: true, conditions: true })
	}

	setExtension(extension: string) {
		this.internalSetExtension("trigger", extension)
	}

}

class ConditionDefinition extends Definition {
	
	constructor(modes: ConditionModes[]) {
		super({ type: true, mode: { enum: modes } })
	}

	setExtension(extension: string) {
		this.internalSetExtension("condition", extension)
	}

}

class EffectDefinition extends Definition {

	constructor(modes: EffectModes[]) {
		super({ type: true, mode: { enum: modes } })
	}

	setExtension(extension: string) {
		this.internalSetExtension("effect", extension)
	}

}

interface TypeDefinition {
	type?: types | types[]
	properties?: PropertyMap
	patternProperties?: PropertyMap
	$ref?: string
	if?: IfPath
	then?: Property
	else?: Property
	required?: string[]
	enum?: any[]
	pattern?: string
	allOf?: Property[]
	anyOf?: Property[]
}
