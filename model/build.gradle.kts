val smithyVersion: String by project

plugins {
    java
    id("software.amazon.smithy.gradle.smithy-jar")
}

dependencies {
    implementation("software.amazon.smithy:smithy-aws-traits:$smithyVersion")
    implementation("software.amazon.smithy:smithy-model:$smithyVersion")
    implementation("software.amazon.smithy:smithy-validation-model:$smithyVersion")
    smithyCli("software.amazon.smithy.rust:codegen-server:+")
}

smithy {
    outputDirectory = layout.buildDirectory.dir("codegen").get().asFile
}

tasks {
    val srcDir = projectDir.resolve("../")
    val serverSdkCrateName: String by project

    val copyServerCrate = register<Copy>("copyServerCrate") {
        from("${layout.buildDirectory.get()}/codegen/$serverSdkCrateName/rust-server-codegen")
        into("$srcDir/$serverSdkCrateName")
    }

    named("assemble") {
        dependsOn("smithyBuild")
        finalizedBy(copyServerCrate)
    }
}
