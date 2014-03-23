VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|

  config.vm.define "one" do |one|
    one.vm.network "private_network", ip: "192.168.50.2"
    one.vm.box = "chef/debian-7.4"
  end

  config.vm.define "two" do |two|
    two.vm.network "private_network", ip: "192.168.50.3"
    two.vm.box = "chef/debian-7.4"
  end

  config.vm.define "three" do |three|
    three.vm.network "private_network", ip: "192.168.50.4"
    three.vm.box = "chef/debian-7.4"
  end

end
