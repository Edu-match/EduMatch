"""Pipeline: Planner → Generator → Evaluator のオーケストレーター"""

import asyncio
from dataclasses import dataclass, field
from pathlib import Path

from .evaluator import run_evaluator
from .generator import run_generator
from .planner import run_planner
from .schemas import EvaluationResult, ProductSpec, SprintResult

MAX_RETRIES = 3
WORKSPACE_BASE = Path(__file__).parent.parent / "workspace"


@dataclass
class SprintHistory:
    sprint_number: int
    attempts: list[tuple[SprintResult, EvaluationResult]] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return any(eval_result.passed for _, eval_result in self.attempts)

    @property
    def latest_feedback(self) -> str:
        if not self.attempts:
            return ""
        _, latest_eval = self.attempts[-1]
        lines = [f"## Sprint {self.sprint_number} 評価フィードバック"]
        lines.append(f"\n**総合スコア:** {latest_eval.overall_score:.2f}")
        lines.append("\n### 不合格の基準:")
        failed = [r for r in latest_eval.criterion_results if not r.passed]
        for r in failed:
            lines.append(f"- [{r.criterion_id}] {r.description}")
            lines.append(f"  スコア: {r.score:.2f}")
            lines.append(f"  フィードバック: {r.feedback}")
        if latest_eval.bugs:
            lines.append("\n### バグ:")
            for bug in latest_eval.bugs:
                lines.append(f"- {bug}")
        if latest_eval.improvements:
            lines.append("\n### 改善点:")
            for imp in latest_eval.improvements:
                lines.append(f"- {imp}")
        return "\n".join(lines)


@dataclass
class PipelineResult:
    spec: ProductSpec
    sprint_histories: list[SprintHistory]
    workspace: Path

    @property
    def total_sprints(self) -> int:
        return len(self.sprint_histories)

    @property
    def passed_sprints(self) -> int:
        return sum(1 for h in self.sprint_histories if h.passed)

    @property
    def success_rate(self) -> float:
        if not self.sprint_histories:
            return 0.0
        return self.passed_sprints / self.total_sprints


async def run_pipeline(
    prompt: str,
    app_url: str = "http://localhost:3000",
    skip_evaluation: bool = False,
) -> PipelineResult:
    """プロンプトからアプリを構築するフルパイプラインを実行する"""

    print("=" * 60)
    print("PHASE 1: PLANNER")
    print("=" * 60)
    print(f"プロンプト: {prompt}\n")

    spec = await run_planner(prompt)

    workspace = WORKSPACE_BASE / spec.project_name.replace(" ", "_").lower()
    workspace.mkdir(parents=True, exist_ok=True)

    print(f"プロジェクト: {spec.project_name}")
    print(f"機能数: {len(spec.features)}")
    print(f"スプリント数: {len(spec.sprints)}")
    print(f"ワークスペース: {workspace}\n")

    sprint_histories: list[SprintHistory] = []

    for sprint in spec.sprints:
        print("=" * 60)
        print(f"PHASE 2: GENERATOR - Sprint {sprint.number}: {sprint.name}")
        print("=" * 60)

        history = SprintHistory(sprint_number=sprint.number)
        feedback = ""

        for attempt in range(1, MAX_RETRIES + 1):
            print(f"\n試行 {attempt}/{MAX_RETRIES}")

            if feedback:
                print("前回のフィードバックを適用して再実装します...")

            sprint_result = await run_generator(
                spec=spec,
                sprint=sprint,
                workspace=workspace,
                feedback=feedback,
            )

            print(f"自己評価 - 信頼度: {sprint_result.self_evaluation.confidence:.2f}")
            print(f"変更ファイル: {len(sprint_result.files_changed)}件")

            if skip_evaluation:
                print("評価をスキップします (skip_evaluation=True)")
                # ダミーの合格結果
                from .schemas import CriterionResult, EvaluationResult
                dummy_eval = EvaluationResult(
                    sprint_number=sprint.number,
                    overall_score=1.0,
                    passed=True,
                    criterion_results=[
                        CriterionResult(
                            criterion_id=c.id,
                            description=c.description,
                            passed=True,
                            score=1.0,
                            evidence="評価スキップ",
                            feedback="",
                        )
                        for c in sprint.acceptance_criteria
                    ],
                    bugs=[],
                    improvements=[],
                    summary="評価スキップ",
                )
                history.attempts.append((sprint_result, dummy_eval))
                break

            print("\n" + "-" * 40)
            print(f"PHASE 3: EVALUATOR - Sprint {sprint.number} (試行 {attempt})")
            print("-" * 40)

            eval_result = await run_evaluator(
                spec=spec,
                sprint=sprint,
                sprint_result=sprint_result,
                workspace=workspace,
                app_url=app_url,
            )

            history.attempts.append((sprint_result, eval_result))

            print(f"総合スコア: {eval_result.overall_score:.2f}")
            print(f"結果: {'合格 ✓' if eval_result.passed else '不合格 ✗'}")

            failed_criteria = [r for r in eval_result.criterion_results if not r.passed]
            if failed_criteria:
                print(f"不合格基準: {len(failed_criteria)}件")
                for r in failed_criteria:
                    print(f"  - [{r.criterion_id}] スコア {r.score:.2f}: {r.feedback[:80]}")

            if eval_result.passed:
                print(f"\nSprint {sprint.number} 合格!")
                break

            if attempt < MAX_RETRIES:
                feedback = history.latest_feedback
                print(f"\nSprint {sprint.number} 不合格。フィードバックを適用して再試行します...")
            else:
                print(f"\nSprint {sprint.number}: {MAX_RETRIES}回試行しましたが合格できませんでした。次のスプリントへ進みます。")

        sprint_histories.append(history)

    result = PipelineResult(
        spec=spec,
        sprint_histories=sprint_histories,
        workspace=workspace,
    )

    print("\n" + "=" * 60)
    print("PIPELINE 完了")
    print("=" * 60)
    print(f"プロジェクト: {spec.project_name}")
    print(f"スプリント: {result.passed_sprints}/{result.total_sprints} 合格")
    print(f"成功率: {result.success_rate:.0%}")
    print(f"ワークスペース: {workspace}")

    return result


if __name__ == "__main__":
    import sys

    prompt = sys.argv[1] if len(sys.argv) > 1 else "シンプルなTodoアプリを作って"
    app_url = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:3000"
    skip_eval = "--skip-eval" in sys.argv

    asyncio.run(run_pipeline(prompt, app_url=app_url, skip_evaluation=skip_eval))
