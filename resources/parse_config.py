import ast
import json
import sys


def make_serializable(obj):
    """将 tuple/set、Path 等 JSON 不支持的类型递归转为可序列化结构。"""
    if isinstance(obj, tuple):
        return [make_serializable(i) for i in obj]
    if isinstance(obj, (set, frozenset)):
        return [make_serializable(i) for i in obj]
    if isinstance(obj, dict):
        return {str(k): make_serializable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [make_serializable(i) for i in obj]
    try:
        from pathlib import Path

        if isinstance(obj, Path):
            return str(obj)
    except ImportError:
        pass
    return obj


def extract_via_ast(source, var_names):
    """
    通过 AST 解析提取顶层赋值
    对每个请求的变量名，取源码中第一次成功的「var = 右侧表达式」求值结果。
    """
    tree = ast.parse(source)
    results = {}
    for node in ast.walk(tree):
        if not isinstance(node, ast.Assign):
            continue
        for target in node.targets:
            if not isinstance(target, ast.Name) or target.id not in var_names:
                continue
            if target.id in results:
                continue
            try:
                results[target.id] = ast.literal_eval(node.value)
            except (ValueError, TypeError):
                expr = ast.Expression(body=node.value)
                ast.fix_missing_locations(expr)
                try:
                    results[target.id] = eval(compile(expr, "<expr>", "eval"))
                except Exception:
                    pass
    return results


def main():
    if len(sys.argv) < 3:
        json.dump(
            {"__error__": "用法: parse_config.py <config_path> <var1> [var2] ..."},
            sys.stdout,
            ensure_ascii=False,
        )
        sys.exit(1)

    filepath = sys.argv[1]
    var_names = set(sys.argv[2:])

    with open(filepath, "r", encoding="utf-8") as f:
        source = f.read()

    try:
        result = extract_via_ast(source, var_names)
    except SyntaxError:
        result = {}

    json.dump(make_serializable(result), sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
