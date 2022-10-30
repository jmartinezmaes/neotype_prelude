import { writeFile } from "fs/promises";
import * as path from "path";
import {
    Application,
    DefaultTheme,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    JSX,
    Renderer,
    RendererEvent,
    TSConfigReader,
} from "typedoc";

const customCss = `
body {
    font-family: "Open Sans", sans-serif;
}

.tsd-typography {
    line-height: 1.45em;
}

.col-content {
    max-width: 750px;
}

h2,
h3,
h4,
h5,
h6 {
    padding-top: 1em;
}

code,
pre {
    font-family: "Source Code Pro", monospace;
    font-size: 0.875em;
    border-radius: 3px;
    border: none;
}

code {
    padding: 0.1em 0.3em;
}

pre {
    padding: 1rem;
}
`;

class CustomTheme extends DefaultTheme {
    constructor(renderer: Renderer) {
        super(renderer);

        this.listenTo(this.owner, RendererEvent.END, async () => {
            const out = this.application.options.getValue("out");
            const dest = path.join(out, "/assets/custom.css");

            await writeFile(dest, customCss.trim());
            this.application.logger.info(`Custom CSS written to ${dest}`);
        });
    }
}

export function load(app: Application) {
    app.renderer.hooks.on("head.end", (ctx) => (
        <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link
                rel="preconnect"
                href="https://fonts.gstatic.com"
                crossOrigin={undefined}
            />
            <link
                href="https://fonts.googleapis.com/css2?family=Open+Sans&family=Source+Code+Pro&family=Source+Serif+Pro&display=swap"
                rel="stylesheet"
            />
            <link
                rel="stylesheet"
                href={ctx.relativeURL("assets/custom.css")}
            />
        </>
    ));

    app.renderer.defineTheme("custom", CustomTheme);
}

const app = new Application();

app.options.addReader(new TSConfigReader());

app.bootstrap();
load(app);

const refl = app.convert();

if (refl) {
    const out = app.options.getValue("out");
    const jsonOut = app.options.getValue("json");

    app.validate(refl);
    await app.generateDocs(refl, out);
    await app.generateJson(refl, jsonOut);
} else {
    throw new Error("could not generate reflections");
}
