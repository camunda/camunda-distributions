// Copyright 2025 Camunda Services GmbH
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"strings"
	"testing"
)

func setCommonEnv(t *testing.T) {
	t.Helper()
	t.Setenv("PR_REPO", "camunda-distributions")
	t.Setenv("PR_URL", "https://github.com/camunda/camunda-distributions/pull/123")
	t.Setenv("PR_NUMBER", "123")
	t.Setenv("PR_TITLE", "feat: add support for X")
	t.Setenv("PR_AUTHOR", "octocat")
}

func TestBuildMessageOpened(t *testing.T) {
	setCommonEnv(t)
	t.Setenv("GH_ACTION", "opened")
	t.Setenv("PR_ADDITIONS", "42")
	t.Setenv("PR_DELETIONS", "7")
	t.Setenv("PR_REVIEWERS_JSON", `[{"login":"reviewer1"},{"login":"reviewer2"}]`)

	got := buildMessage()

	for _, want := range []string{
		":arrow_heading_up:",
		"[camunda-distributions]", // no camunda-platform- prefix to strip
		"PR opened · by @octocat",
		"review: @reviewer1, @reviewer2",
		"+42/-7",
		"<https://github.com/camunda/camunda-distributions/pull/123|#123 feat: add support for X>",
	} {
		if !strings.Contains(got, want) {
			t.Errorf("opened message missing %q\n got: %s", want, got)
		}
	}
}

func TestBuildMessageOpenedNoReviewers(t *testing.T) {
	setCommonEnv(t)
	t.Setenv("GH_ACTION", "opened")
	t.Setenv("PR_ADDITIONS", "1")
	t.Setenv("PR_DELETIONS", "0")
	t.Setenv("PR_REVIEWERS_JSON", "[]")

	got := buildMessage()
	if strings.Contains(got, "review:") {
		t.Errorf("did not expect a review segment, got: %s", got)
	}
}

func TestBuildMessageMergedByAuthor(t *testing.T) {
	setCommonEnv(t)
	t.Setenv("GH_ACTION", "closed")
	t.Setenv("PR_MERGED", "true")
	t.Setenv("PR_CREATED_AT", "2024-01-01T09:00:00Z")
	t.Setenv("PR_MERGED_AT", "2024-01-02T13:00:00Z")
	t.Setenv("PR_MERGED_BY", "octocat") // merger == author

	got := buildMessage()
	if !strings.Contains(got, ":tada:") || !strings.Contains(got, "PR merged after 1d 4h") || !strings.Contains(got, "by @octocat") {
		t.Errorf("unexpected merged message: %s", got)
	}
	if strings.Contains(got, "merged by") {
		t.Errorf("should omit 'merged by' when merger == author: %s", got)
	}
}

func TestBuildMessageMergedByOther(t *testing.T) {
	setCommonEnv(t)
	t.Setenv("GH_ACTION", "closed")
	t.Setenv("PR_MERGED", "true")
	t.Setenv("PR_CREATED_AT", "2024-01-01T09:00:00Z")
	t.Setenv("PR_MERGED_AT", "2024-01-01T10:00:00Z")
	t.Setenv("PR_MERGED_BY", "mergerbot")

	got := buildMessage()
	if !strings.Contains(got, "· merged by @mergerbot") {
		t.Errorf("expected 'merged by @mergerbot' segment, got: %s", got)
	}
	if !strings.Contains(got, "PR merged after 1h") {
		t.Errorf("expected '1h' duration, got: %s", got)
	}
}

func TestBuildMessageClosedUnmerged(t *testing.T) {
	setCommonEnv(t)
	t.Setenv("GH_ACTION", "closed")
	t.Setenv("PR_MERGED", "false")

	got := buildMessage()
	if !strings.Contains(got, ":x:") || !strings.Contains(got, "closed without merge · by @octocat") {
		t.Errorf("unexpected closed message: %s", got)
	}
}

func TestShortRepo(t *testing.T) {
	t.Parallel()
	cases := map[string]string{
		"camunda-platform-helm": "helm",
		"camunda-distributions": "camunda-distributions",
		"team-distribution":     "team-distribution",
	}
	for in, want := range cases {
		if got := shortRepo(in); got != want {
			t.Errorf("shortRepo(%q) = %q, want %q", in, got, want)
		}
	}
}
