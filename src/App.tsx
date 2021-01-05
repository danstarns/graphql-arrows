import React, { DOMElement, useEffect, useRef, useState } from "react";
import Iframe from "react-iframe";
import { parse, TypeNode } from "graphql";
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-graphqlschema";
import "ace-builds/src-noconflict/theme-monokai";

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

function contentToArrows(content: string) {
    try {
        const document = parse(content);

        const model: ArrowsModel = document.definitions.reduce(
            (res: ArrowsModel, definition, index, array) => {
                if (definition.kind !== "ObjectTypeDefinition") {
                    return res;
                }

                const x = array.length * index + 300;
                const y = array.length / index - 300;

                res.graph.nodes.push({
                    caption: definition.name.value,
                    id: definition.name.value,
                    position: { x, y },
                    properties: definition.fields.reduce((res, field) => {
                        return {
                            ...res,
                            [field.name.value]: getTypeName(field.type),
                        };
                    }, {}),
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
    const ref = useRef();

    useEffect(() => {
        return () => {
            console.log(ref);
        };
    }, []);

    return (
        <iframe
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
    onChange: (content: string, event: any) => void;
    value: string;
}) {
    return (
        <AceEditor
            mode="graphqlschema"
            theme="monokai"
            onChange={onChange}
            value={value}
            fontSize="3em"
            style={{ width: "100%", height: "100%" }}
        />
    );
}

function App() {
    const [content, setContent] = useState(``);
    const [url, setUrl] = useState(``);

    useEffect(() => {
        setUrl("");

        const arrowsAppModel = contentToArrows(content);

        const jsonString = JSON.stringify(arrowsAppModel);

        setUrl("https://arrows.app/#/import/json=" + btoa(jsonString));
    }, [content]);

    return (
        <div className="d-flex">
            <div className="m-2 w-50 vh-100">
                <InputFrame onChange={setContent} value={content}></InputFrame>
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
