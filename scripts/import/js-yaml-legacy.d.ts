// js-yaml 4.1.0 under the alias the importer reads legacy YAML with (D-008). It is untyped because @types/js-yaml
// describes the package name, not the alias.
declare module 'js-yaml-legacy' {
  const yaml: { load(text: string): unknown };
  export default yaml;
}
