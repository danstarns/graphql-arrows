import React, { useEffect, useState } from "react";
import {
    DirectiveNode,
    ObjectTypeDefinitionNode,
    parse,
    StringValueNode,
    TypeNode,
} from "graphql";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-graphqlschema";
import "ace-builds/src-noconflict/theme-monokai";

function makeId(length: number = 20): string {
    let result = "";
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * characters.length)
        );
    }

    return result;
}

interface ArrowsRelationships {
    id: string;
    fromId: string;
    toId: string;
    type: string;
    properties: any;
}

interface ArrowsNode {
    id: string;
    position: { x: number; y: number };
    caption: string;
    properties: any;
}

interface ArrowsGraph {
    nodes: ArrowsNode[];
    relationships: ArrowsRelationships[];
    style: any;
}

interface ArrowsModel {
    diagramName: string;
    graph: ArrowsGraph;
}

function getTypeName(type: TypeNode): string {
    switch (type.kind) {
        case "NonNullType":
            switch (type.type.kind) {
                case "ListType":
                    // @ts-ignore
                    return type.type.type.name.value;

                case "NamedType":
                    return type.type.name.value;
            }
        case "NamedType":
            return type.name.value;
        case "ListType":
            switch (type.type.kind) {
                case "NamedType":
                    return type.type.name.value;
                case "NonNullType":
                    // @ts-ignore
                    return type.type.type.name.value;
            }
    }
}

function typeDefsToArrows(typeDefs: string) {
    try {
        const document = parse(typeDefs);

        const nodes = document.definitions.reduce((res, definition) => {
            if (definition.kind !== "ObjectTypeDefinition") {
                return res;
            }

            const id = makeId();

            return [
                ...res,
                {
                    definition,
                    id,
                },
            ];
        }, []) as { definition: ObjectTypeDefinitionNode; id: string }[];

        const model: ArrowsModel = nodes.reduce(
            (res: ArrowsModel, node, index, array) => {
                const x = array.length + 400 * index;
                const y = array.length - 400 / index;

                const fields = node.definition.fields.filter(
                    (x) =>
                        !x.directives ||
                        !x.directives.find(
                            (x) => x.name.value === "relationship"
                        )
                );

                const relationships = node.definition.fields.filter(
                    (x) =>
                        x.directives &&
                        x.directives.find(
                            (x) => x.name.value === "relationship"
                        )
                );

                res.graph.nodes.push({
                    caption: node.definition.name.value,
                    id: node.id,
                    position: { x, y },
                    properties: fields.reduce((res, field) => {
                        return {
                            ...res,
                            [field.name.value]: getTypeName(field.type),
                        };
                    }, {}),
                });

                relationships.forEach((relationship) => {
                    const to = nodes.find(
                        (x) =>
                            x.definition.name.value ===
                            getTypeName(relationship.type)
                    );

                    const directive = relationship.directives.find(
                        (x) => x.name.value === "relationship"
                    ) as DirectiveNode;

                    const direction = (directive.arguments.find(
                        (x) => x.name.value === "direction"
                    ).value as StringValueNode).value;

                    const type = (directive.arguments.find(
                        (x) => x.name.value === "type"
                    ).value as StringValueNode).value;

                    if (!to) {
                        throw new Error("invalid relationship");
                    }

                    const graphRel = {
                        id: makeId(),
                        type,
                        properties: {},
                    };

                    if (direction === "OUT") {
                        res.graph.relationships.push({
                            ...graphRel,
                            fromId: node.id,
                            toId: to.id,
                        });
                    } else {
                        res.graph.relationships.push({
                            ...graphRel,
                            fromId: to.id,
                            toId: node.id,
                        });
                    }
                });

                return res;
            },
            {
                diagramName: "@neo4j/graphql",
                graph: { nodes: [], relationships: [], style: {} },
            } as ArrowsModel
        );

        return model;
    } catch (error) {
        console.error(error);
    }
}

function DisplayFrame({ url }: { url: string }) {
    return (
        <iframe
            id="my-frame"
            key={url}
            src={url}
            style={{ width: "100%", height: "100%" }}
        ></iframe>
    );
}

function InputFrame({
    onChange,
    value,
}: {
    onChange: (typeDefs: string, event: any) => void;
    value: string;
}) {
    return (
        <AceEditor
            mode="graphqlschema"
            theme="monokai"
            onChange={onChange}
            value={value}
            fontSize="2em"
            style={{ width: "100%", height: "100%" }}
        />
    );
}

function App() {
    const [typeDefs, setTypeDefs] = useState(``);
    const [url, setUrl] = useState(``);

    useEffect(() => {
        setUrl("");

        const arrowsAppModel = typeDefsToArrows(typeDefs);

        const jsonString = JSON.stringify(arrowsAppModel);

        setUrl("https://arrows.app/#/import/json=" + btoa(jsonString));
    }, [typeDefs]);

    return (
        <div className="d-flex">
            <div className="m-2 w-50 vh-100">
                <InputFrame
                    onChange={setTypeDefs}
                    value={typeDefs}
                ></InputFrame>
            </div>
            {url && (
                <div className="m-2 w-50 vh-100">
                    <DisplayFrame url={url}></DisplayFrame>
                </div>
            )}
        </div>
    );
}

export default App;
