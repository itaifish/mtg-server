rootProject.name = "mtg-server"

includeBuild("smithy-rs")
include(":model")

plugins {
    id("software.amazon.smithy.gradle.smithy-jar").version("1.3.0").apply(false)
    kotlin("jvm").version("2.1.0").apply(false)
}
