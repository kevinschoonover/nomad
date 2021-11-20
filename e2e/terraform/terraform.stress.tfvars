region                           = "us-east-1"
instance_type                    = "m5.large"
server_count                     = "5"
client_count_ubuntu_bionic_amd64 = "8"
client_count_windows_2016_amd64  = "0"
profile                          = "dev-cluster"
nomad_acls                       = true
nomad_enterprise                 = false
vault                            = true
volumes                          = false
tls                              = true

nomad_version      = "1.2.1" # default version for deployment
nomad_local_binary = ""      # overrides nomad_version if set
nomad_url          = ""      # overrides nomad_version if set
# Example overrides:
# nomad_local_binary = "../../pkg/linux_amd64/nomad"
# nomad_local_binary_client_windows_2016_amd64 = ["../../pkg/windows_amd64/nomad.exe"]

# The nightly E2E runner will set a nomad_sha flag; this should not be used
# outside of the nightly E2E runner and will usually fail because the build
# will not be available
