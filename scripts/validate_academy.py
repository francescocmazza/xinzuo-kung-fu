#!/usr/bin/env python3
"""Validate Xinzuo Academy curriculum/question-bank data."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
ACADEMY = ROOT / "academy" / "data"
CONTENT = ROOT / "content" / "en"
LOCALES = ("en", "it")


class ValidationError(RuntimeError):
    pass


def load(locale: str) -> dict[str, Any]:
    path = ACADEMY / f"course.{locale}.json"
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValidationError(f"{path}: {exc}") from exc


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValidationError(message)


def ids(course: dict[str, Any]) -> dict[str, list[str]]:
    result: dict[str, list[str]] = {
        "levels": [],
        "modules": [],
        "lessons": [],
        "concepts": [],
        "questions": [],
        "mini_tests": [],
    }
    for level in course.get("levels", []):
        result["levels"].append(level["id"])
        for module in level.get("modules", []):
            result["modules"].append(module["id"])
            if module.get("status") != "active":
                continue
            for lesson in module.get("lessons", []):
                result["lessons"].append(lesson["id"])
                result["concepts"].append(lesson["concept_id"])
                result["questions"].append(lesson["question"]["id"])
                result["questions"].extend(q["id"] for q in lesson.get("recovery_questions", []))
            mini = module.get("mini_test")
            if mini:
                result["mini_tests"].append(mini["id"])
                result["questions"].extend(q["id"] for q in mini.get("questions", []))
    return result


def validate_question(question: dict[str, Any], where: str) -> None:
    require(question.get("id"), f"{where}: missing question id")
    options = question.get("options")
    require(isinstance(options, list) and len(options) >= 2, f"{where}: requires at least two options")
    option_ids = [option.get("id") for option in options]
    require(all(option_ids), f"{where}: every option requires an id")
    require(len(option_ids) == len(set(option_ids)), f"{where}: duplicate option ids")
    require(question.get("correct") in option_ids, f"{where}: correct answer is not an option")
    require(bool(question.get("prompt")), f"{where}: missing prompt")
    require(bool(question.get("explanation")), f"{where}: missing explanation")


def validate_sources(paths: list[str], where: str) -> None:
    for relative in paths:
        source = CONTENT / relative
        require(source.is_file(), f"{where}: source page does not exist: {relative}")


def validate_course(course: dict[str, Any], locale: str) -> None:
    require(course.get("locale") == locale, f"{locale}: locale metadata mismatch")
    certification = course.get("certification", {})
    require(certification.get("minimum_score") == 0.8, f"{locale}: certification minimum must be 80%")
    require(certification.get("maximum_critical_errors") == 0, f"{locale}: critical-error allowance must be zero")
    require(certification.get("remediation_required_before_retry") is True, f"{locale}: remediation-before-retry must be enabled")

    levels = course.get("levels", [])
    require([level.get("id") for level in levels] == ["base", "intermediate", "advanced"], f"{locale}: expected Base/Intermediate/Advanced levels")

    seen: dict[str, set[str]] = {key: set() for key in ("module", "lesson", "question", "concept", "mini")}
    active_modules = 0

    for level in levels:
        for module in level.get("modules", []):
            module_id = module.get("id")
            require(module_id and module_id not in seen["module"], f"{locale}: duplicate/missing module id {module_id!r}")
            seen["module"].add(module_id)
            validate_sources(module.get("source_paths", []), f"{locale}:{module_id}")

            if module.get("status") != "active":
                continue

            active_modules += 1
            lessons = module.get("lessons", [])
            require(lessons, f"{locale}:{module_id}: active module requires lessons")

            for lesson in lessons:
                lesson_id = lesson.get("id")
                concept_id = lesson.get("concept_id")
                require(lesson_id and lesson_id not in seen["lesson"], f"{locale}: duplicate/missing lesson id {lesson_id!r}")
                require(concept_id and concept_id not in seen["concept"], f"{locale}: duplicate/missing concept id {concept_id!r}")
                seen["lesson"].add(lesson_id)
                seen["concept"].add(concept_id)
                validate_sources([lesson["source_path"]], f"{locale}:{lesson_id}")
                require(isinstance(lesson.get("critical"), bool), f"{locale}:{lesson_id}: critical must be boolean")

                question = lesson.get("question", {})
                validate_question(question, f"{locale}:{lesson_id}:learning")
                require(question["id"] not in seen["question"], f"{locale}: duplicate question id {question['id']}")
                seen["question"].add(question["id"])

                recovery = lesson.get("recovery_questions", [])
                require(len(recovery) >= 2, f"{locale}:{lesson_id}: at least two recovery variants are required")
                for question in recovery:
                    validate_question(question, f"{locale}:{lesson_id}:recovery")
                    require(question["id"] not in seen["question"], f"{locale}: duplicate question id {question['id']}")
                    seen["question"].add(question["id"])

            mini = module.get("mini_test")
            require(isinstance(mini, dict), f"{locale}:{module_id}: active module requires mini-test")
            mini_id = mini.get("id")
            require(mini_id and mini_id not in seen["mini"], f"{locale}: duplicate/missing mini-test id {mini_id!r}")
            seen["mini"].add(mini_id)
            require(mini.get("informational") is True, f"{locale}:{mini_id}: mini-test must remain informational")
            require(len(mini.get("questions", [])) >= len(lessons), f"{locale}:{mini_id}: mini-test should cover the module concepts")
            for question in mini.get("questions", []):
                validate_question(question, f"{locale}:{mini_id}")
                require(question.get("concept_id") in seen["concept"], f"{locale}:{mini_id}: unknown concept {question.get('concept_id')}")
                require(isinstance(question.get("critical"), bool), f"{locale}:{question.get('id')}: critical must be boolean")
                require(question["id"] not in seen["question"], f"{locale}: duplicate question id {question['id']}")
                seen["question"].add(question["id"])

    require(active_modules >= 1, f"{locale}: at least one module must be active")

    for kind, values in ids(course).items():
        if kind == "concepts":
            continue
        require(len(values) == len(set(values)), f"{locale}: duplicate {kind} ids")


def compare_locales(reference: dict[str, Any], localized: dict[str, Any], locale: str) -> None:
    ref_ids = ids(reference)
    localized_ids = ids(localized)
    for kind, values in ref_ids.items():
        require(values == localized_ids[kind], f"{locale}: {kind} structure drifts from English source")


def main() -> int:
    courses = {locale: load(locale) for locale in LOCALES}
    for locale, course in courses.items():
        validate_course(course, locale)
    for locale in LOCALES:
        if locale != "en":
            compare_locales(courses["en"], courses[locale], locale)

    active = sum(
        1
        for level in courses["en"]["levels"]
        for module in level["modules"]
        if module.get("status") == "active"
    )
    questions = len(ids(courses["en"])["questions"])
    print(f"Academy validation OK: {len(LOCALES)} locales, {active} active module(s), {questions} question variants")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
