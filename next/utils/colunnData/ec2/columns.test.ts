import { describe, test, expect } from "vitest";
import { calculateCost } from "./columns";
import { EC2Instance } from "@/types";

const currency = { code: "USD", usdRate: 1, cnyRate: 1 };

// Only the fields calculateCost reads for the gpu_memory unit matter here.
function makeInstance(gpu: number, gpuMemory: number): EC2Instance {
    return { GPU: gpu, GPU_memory: gpuMemory } as unknown as EC2Instance;
}

describe("calculateCost gpu_memory pricing (issue #695)", () => {
    test("multi-GPU cost is based on total VRAM, not per-GPU", () => {
        // GPU_memory is now per-GPU (16 GiB), 8 GPUs → 128 GiB total.
        // Cost-per-GiB-GPU must divide by the total (128), matching the
        // behaviour before per-GPU memory was introduced.
        const inst = makeInstance(8, 16);
        const got = calculateCost(
            "3.06",
            inst,
            "gpu_memory",
            "hourly",
            "us-east-1",
            currency,
        );
        expect(got).toBeCloseTo(3.06 / 128, 10);
    });

    test("fractional-GPU cost divides by the instance's total VRAM", () => {
        // g6f-style: 1/8 of a GPU with a 3 GiB slice. GPU_memory already holds
        // the total VRAM the instance gets, so the divisor must be 3 — NOT
        // 3 * 0.125. The Math.max(GPU, 1) guard ensures this.
        const inst = makeInstance(0.125, 3);
        const got = calculateCost(
            "3",
            inst,
            "gpu_memory",
            "hourly",
            "us-east-1",
            currency,
        );
        expect(got).toBeCloseTo(3 / 3, 10);
    });

    test("single-GPU is unaffected", () => {
        const inst = makeInstance(1, 24);
        const got = calculateCost(
            "2.4",
            inst,
            "gpu_memory",
            "hourly",
            "us-east-1",
            currency,
        );
        expect(got).toBeCloseTo(2.4 / 24, 10);
    });
});
