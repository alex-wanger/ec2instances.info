package ec2

import "testing"

// TestAddGpuInfoPerGpuMemory verifies that GPU memory is reported per-GPU
// (issue #695): the total VRAM in GPU_DATA is divided by the GPU count for
// instances with one or more full GPUs, fractional-GPU instances keep their
// stored slice, and non-divisible totals are rounded to the nearest integer.
func TestAddGpuInfoPerGpuMemory(t *testing.T) {
	cases := map[string]int{
		"g4dn.xlarge":       16,  // 1 GPU: total == per-GPU, unchanged
		"g3.16xlarge":       8,   // 32 / 4
		"p3.16xlarge":       16,  // 128 / 8
		"p4de.24xlarge":     80,  // 640 / 8
		"g6f.large":         3,   // fractional (count < 1): left as-is
		"gr6f.4xlarge":      12,  // fractional: left as-is
		"p6-b300.48xlarge":  263, // 2100 / 8 = 262.5, rounded
	}

	instances := make(map[string]*EC2Instance, len(cases))
	for instanceType := range cases {
		instances[instanceType] = &EC2Instance{}
	}

	addGpuInfo(instances)

	for instanceType, want := range cases {
		if got := instances[instanceType].GPUMemory; got != want {
			t.Errorf("%s: GPUMemory = %d, want %d", instanceType, got, want)
		}
	}
}
